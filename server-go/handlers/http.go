package handlers

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gorilla/mux"

	"server-go/config"
	"server-go/modules/s3client"
)

// HTTPHandler handles REST API requests
type HTTPHandler struct {
	configManager *config.Manager
	clientsCount  func() int
	s3Client      *s3client.Client
	projectRoot   string
}

// NewHTTPHandler creates a new HTTP handler
func NewHTTPHandler(cm *config.Manager, clientsCount func() int, s3Client *s3client.Client, projectRoot string) *HTTPHandler {
	return &HTTPHandler{
		configManager: cm,
		clientsCount:  clientsCount,
		s3Client:      s3Client,
		projectRoot:   projectRoot,
	}
}

// RegisterRoutes registers all HTTP routes
func (h *HTTPHandler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/api/dropdown-options/{type}", h.GetDropdownOptions).Methods("GET")
	r.HandleFunc("/api/dropdown-options", h.GetAllDropdownOptions).Methods("GET")
	r.HandleFunc("/api/health", h.HealthCheck).Methods("GET")
	r.HandleFunc("/api/config", h.GetConfig).Methods("GET")
	r.HandleFunc("/api/feature-flags", h.GetFeatureFlags).Methods("GET")
	r.HandleFunc("/api/fetch-article", h.FetchArticle).Methods("POST")
	r.HandleFunc("/api/articles/{journalId}/{articleId}/{filename}", h.ServeArticleFile).Methods("GET")
}

// FetchArticleRequest represents the request body for fetching an article
type FetchArticleRequest struct {
	JournalID string `json:"journalId"`
	ArticleID string `json:"articleId"`
}

// FetchArticleResponse represents the response for fetching an article
type FetchArticleResponse struct {
	Success   bool            `json:"success"`
	JournalID string          `json:"journalId"`
	ArticleID string          `json:"articleId"`
	PDFURL    string          `json:"pdfUrl"`
	JSONURL   string          `json:"jsonUrl"`
	PDFBase64 string          `json:"pdfBase64,omitempty"`
	JSONData  json.RawMessage `json:"jsonData,omitempty"`
	Error     string          `json:"error,omitempty"`
}

// FetchArticle fetches PDF and JSON files from S3/MinIO
func (h *HTTPHandler) FetchArticle(w http.ResponseWriter, r *http.Request) {
	var req FetchArticleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validation
	if req.JournalID == "" {
		h.sendError(w, "journalId is required", http.StatusBadRequest)
		return
	}
	if req.ArticleID == "" {
		h.sendError(w, "articleId is required", http.StatusBadRequest)
		return
	}

	log.Printf("📥 Fetch article request: %s/%s", req.JournalID, req.ArticleID)

	// Check if S3 client is available
	if h.s3Client == nil {
		h.sendError(w, "S3 client not configured", http.StatusServiceUnavailable)
		return
	}

	// Fetch article files from S3
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	files, err := h.s3Client.FetchArticle(ctx, req.JournalID, req.ArticleID)
	if err != nil {
		log.Printf("❌ Failed to fetch article: %v", err)
		h.sendError(w, "Failed to fetch article: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Save files to local cache directory
	cacheDir := filepath.Join(h.projectRoot, "cache", "articles")
	pdfPath, jsonPath, err := h.s3Client.SaveToLocal(files, cacheDir)
	if err != nil {
		log.Printf("❌ Failed to save files locally: %v", err)
		h.sendError(w, "Failed to save files: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Generate URLs for serving the files with proper filenames
	pdfFilename := req.JournalID + "_" + req.ArticleID + ".pdf"
	jsonFilename := req.JournalID + "_" + req.ArticleID + "-marked-boxes.json"
	pdfURL := "/api/articles/" + req.JournalID + "/" + req.ArticleID + "/" + pdfFilename
	jsonURL := "/api/articles/" + req.JournalID + "/" + req.ArticleID + "/" + jsonFilename

	log.Printf("✅ Article fetched successfully: %s/%s", req.JournalID, req.ArticleID)
	log.Printf("   Local PDF: %s", pdfPath)
	log.Printf("   Local JSON: %s", jsonPath)

	// Send response with URLs
	response := FetchArticleResponse{
		Success:   true,
		JournalID: req.JournalID,
		ArticleID: req.ArticleID,
		PDFURL:    pdfURL,
		JSONURL:   jsonURL,
	}

	// Optionally include base64 PDF and JSON data in response for immediate use
	response.PDFBase64 = base64.StdEncoding.EncodeToString(files.PDFData)
	response.JSONData = files.JSONData

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// ServeArticleFile serves a cached article file (PDF or JSON)
func (h *HTTPHandler) ServeArticleFile(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	journalID := vars["journalId"]
	articleID := vars["articleId"]
	filename := vars["filename"]

	filePath := filepath.Join(h.projectRoot, "cache", "articles", journalID, articleID, filename)

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		http.Error(w, "File not found: "+filename, http.StatusNotFound)
		return
	}

	// Set content type based on file extension
	if strings.HasSuffix(filename, ".pdf") {
		w.Header().Set("Content-Type", "application/pdf")
		w.Header().Set("Content-Disposition", "inline; filename="+filename)
	} else if strings.HasSuffix(filename, ".json") {
		w.Header().Set("Content-Type", "application/json")
	}

	http.ServeFile(w, r, filePath)
}

// GetDropdownOptions returns dropdown options for a specific type
func (h *HTTPHandler) GetDropdownOptions(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	overlayType := vars["type"]

	options, err := h.configManager.GetDropdownOptions(overlayType)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if options == nil {
		http.Error(w, "Unknown overlay type: "+overlayType, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"type":    overlayType,
		"options": options,
	})
}

// GetAllDropdownOptions returns all dropdown options
func (h *HTTPHandler) GetAllDropdownOptions(w http.ResponseWriter, r *http.Request) {
	options, err := h.configManager.GetAllDropdownOptions()
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(options)
}

// HealthCheck returns server health status
func (h *HTTPHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "ok",
		"timestamp": time.Now().Format(time.RFC3339),
		"clients":   h.clientsCount(),
	})
}

// GetConfig returns the server configuration
func (h *HTTPHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	cfg, err := h.configManager.GetConfig()
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cfg)
}

// GetFeatureFlags returns the feature flags
func (h *HTTPHandler) GetFeatureFlags(w http.ResponseWriter, r *http.Request) {
	flags, err := h.configManager.GetFeatureFlags()
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(flags)
}

func (h *HTTPHandler) sendError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"error":   message,
	})
}

// CORSMiddleware handles CORS headers
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
