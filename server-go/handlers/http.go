package handlers

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
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
	r.HandleFunc("/api/articles/merge-json", h.MergeJSON).Methods("POST")
	r.HandleFunc("/api/articles/upload-json", h.UploadJSON).Methods("POST")
	r.HandleFunc("/api/articles/{journalId}/{articleId}/{filename:.*}", h.ServeArticleFile).Methods("GET")
}

// FetchArticleRequest represents the request body for fetching an article
type FetchArticleRequest struct {
	JournalID string `json:"journalId"`
	ArticleID string `json:"articleId"`
}

// FileTreeNode represents a file or directory in the file tree
type FileTreeNode struct {
	Name     string          `json:"name"`
	Type     string          `json:"type"` // "file" or "directory"
	Path     string          `json:"path,omitempty"`
	Size     int64           `json:"size,omitempty"`
	Children []*FileTreeNode `json:"children,omitempty"`
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
	FileTree  *FileTreeNode   `json:"fileTree,omitempty"`
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

	// Build file tree from downloaded files
	fileTree := h.buildFileTree(req.ArticleID, files.Files)

	// Send response with URLs
	response := FetchArticleResponse{
		Success:   true,
		JournalID: req.JournalID,
		ArticleID: req.ArticleID,
		PDFURL:    pdfURL,
		JSONURL:   jsonURL,
		FileTree:  fileTree,
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

// buildFileTree builds a file tree structure from the downloaded files
func (h *HTTPHandler) buildFileTree(rootName string, files map[string]*s3client.FileData) *FileTreeNode {
	root := &FileTreeNode{
		Name:     rootName,
		Type:     "directory",
		Children: []*FileTreeNode{},
	}

	// Create a map to track directories
	dirs := make(map[string]*FileTreeNode)
	dirs[""] = root

	// Collect all paths and sort them
	paths := make([]string, 0, len(files))
	for path := range files {
		paths = append(paths, path)
	}
	sort.Strings(paths)

	// Build the tree
	for _, filePath := range paths {
		fileData := files[filePath]
		parts := strings.Split(filePath, "/")

		// Create directories as needed
		currentPath := ""
		parent := root
		for i := 0; i < len(parts)-1; i++ {
			if currentPath == "" {
				currentPath = parts[i]
			} else {
				currentPath = currentPath + "/" + parts[i]
			}

			if _, exists := dirs[currentPath]; !exists {
				newDir := &FileTreeNode{
					Name:     parts[i],
					Type:     "directory",
					Path:     currentPath,
					Children: []*FileTreeNode{},
				}
				parent.Children = append(parent.Children, newDir)
				dirs[currentPath] = newDir
			}
			parent = dirs[currentPath]
		}

		// Add the file
		fileNode := &FileTreeNode{
			Name: fileData.Filename,
			Type: "file",
			Path: filePath,
			Size: int64(len(fileData.Data)),
		}
		parent.Children = append(parent.Children, fileNode)
	}

	return root
}

// MergeJSONRequest represents the request body for merging JSON files
type MergeJSONRequest struct {
	JournalID string            `json:"journalId"`
	ArticleID string            `json:"articleId"`
	FilePaths []string          `json:"filePaths"`
	KeyNames  map[string]string `json:"keyNames,omitempty"` // Map of filePath to key name
}

// MergeJSONResponse represents the response for merging JSON files
type MergeJSONResponse struct {
	Success        bool        `json:"success"`
	MergedData     interface{} `json:"mergedData,omitempty"`
	MergedFileName string      `json:"mergedFileName,omitempty"`
	Error          string      `json:"error,omitempty"`
}

// MergeJSON merges multiple JSON files from an article
func (h *HTTPHandler) MergeJSON(w http.ResponseWriter, r *http.Request) {
	var req MergeJSONRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.JournalID == "" || req.ArticleID == "" {
		h.sendError(w, "journalId and articleId are required", http.StatusBadRequest)
		return
	}

	if len(req.FilePaths) == 0 {
		h.sendError(w, "filePaths must contain at least one file", http.StatusBadRequest)
		return
	}

	log.Printf("🔀 Merge JSON request: %s/%s, files: %v, keyNames: %v", req.JournalID, req.ArticleID, req.FilePaths, req.KeyNames)

	// Read and merge JSON files
	articleDir := filepath.Join(h.projectRoot, "cache", "articles", req.JournalID, req.ArticleID)

	// Determine merge mode: if keyNames provided, create object; otherwise create array
	useKeyNames := len(req.KeyNames) > 0

	var mergedObject map[string]interface{}
	var mergedArray []interface{}

	if useKeyNames {
		mergedObject = make(map[string]interface{})
	}

	for _, filePath := range req.FilePaths {
		fullPath := filepath.Join(articleDir, filePath)

		data, err := os.ReadFile(fullPath)
		if err != nil {
			log.Printf("❌ Failed to read file %s: %v", filePath, err)
			h.sendError(w, fmt.Sprintf("Failed to read file %s: %v", filePath, err), http.StatusInternalServerError)
			return
		}

		var jsonContent interface{}
		if err := json.Unmarshal(data, &jsonContent); err != nil {
			log.Printf("❌ Failed to parse JSON from %s: %v", filePath, err)
			h.sendError(w, fmt.Sprintf("Failed to parse JSON from %s: %v", filePath, err), http.StatusBadRequest)
			return
		}

		if useKeyNames {
			// Use key name if provided, otherwise use filename without extension
			keyName := req.KeyNames[filePath]
			if keyName == "" {
				// Default to filename without extension
				baseName := filepath.Base(filePath)
				keyName = strings.TrimSuffix(baseName, filepath.Ext(baseName))
			}
			mergedObject[keyName] = jsonContent
		} else {
			// Original behavior: merge into array
			if arr, ok := jsonContent.([]interface{}); ok {
				mergedArray = append(mergedArray, arr...)
			} else {
				mergedArray = append(mergedArray, jsonContent)
			}
		}
	}

	var mergedData interface{}
	if useKeyNames {
		mergedData = mergedObject
	} else {
		mergedData = mergedArray
	}

	mergedFileName := fmt.Sprintf("%s_%s-merged.json", req.JournalID, req.ArticleID)
	log.Printf("✅ Merged %d JSON files into %s", len(req.FilePaths), mergedFileName)

	// Save merged file locally
	mergedBytes, _ := json.MarshalIndent(mergedData, "", "  ")
	mergedPath := filepath.Join(articleDir, mergedFileName)
	if err := os.WriteFile(mergedPath, mergedBytes, 0644); err != nil {
		log.Printf("⚠️ Failed to save merged file locally: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(MergeJSONResponse{
		Success:        true,
		MergedData:     mergedData,
		MergedFileName: mergedFileName,
	})
}

// UploadJSONRequest represents the request body for uploading JSON to S3
type UploadJSONRequest struct {
	JournalID string      `json:"journalId"`
	ArticleID string      `json:"articleId"`
	FileName  string      `json:"fileName"`
	JSONData  interface{} `json:"jsonData"`
}

// UploadJSONResponse represents the response for uploading JSON to S3
type UploadJSONResponse struct {
	Success bool   `json:"success"`
	S3Path  string `json:"s3Path,omitempty"`
	Error   string `json:"error,omitempty"`
}

// UploadJSON uploads a JSON file to S3
func (h *HTTPHandler) UploadJSON(w http.ResponseWriter, r *http.Request) {
	// Read raw body to handle large JSON
	body, err := io.ReadAll(r.Body)
	if err != nil {
		h.sendError(w, "Failed to read request body", http.StatusBadRequest)
		return
	}

	var req UploadJSONRequest
	if err := json.Unmarshal(body, &req); err != nil {
		h.sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.JournalID == "" || req.ArticleID == "" || req.FileName == "" {
		h.sendError(w, "journalId, articleId, and fileName are required", http.StatusBadRequest)
		return
	}

	if h.s3Client == nil {
		h.sendError(w, "S3 client not configured", http.StatusServiceUnavailable)
		return
	}

	log.Printf("📤 Upload JSON request: %s/%s/%s", req.JournalID, req.ArticleID, req.FileName)

	// Convert JSON data to bytes
	jsonBytes, err := json.MarshalIndent(req.JSONData, "", "  ")
	if err != nil {
		h.sendError(w, "Failed to serialize JSON data", http.StatusBadRequest)
		return
	}

	// Upload to S3
	s3Path := fmt.Sprintf("%s/%s/%s", req.JournalID, req.ArticleID, req.FileName)
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	if err := h.s3Client.UploadFile(ctx, s3Path, jsonBytes, "application/json"); err != nil {
		log.Printf("❌ Failed to upload to S3: %v", err)
		h.sendError(w, "Failed to upload to S3: "+err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("✅ Uploaded to S3: %s", s3Path)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(UploadJSONResponse{
		Success: true,
		S3Path:  s3Path,
	})
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
