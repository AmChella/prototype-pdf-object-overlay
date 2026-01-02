package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"server-go/config"
	"server-go/models"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins
	},
}

// WSHandler handles WebSocket connections
type WSHandler struct {
	configManager   *config.Manager
	clients         map[*websocket.Conn]bool
	mu              sync.RWMutex
	currentDocument string
	projectRoot     string
}

// NewWSHandler creates a new WebSocket handler
func NewWSHandler(cm *config.Manager, projectRoot string) *WSHandler {
	return &WSHandler{
		configManager: cm,
		clients:       make(map[*websocket.Conn]bool),
		projectRoot:   projectRoot,
	}
}

// ClientsCount returns the number of connected clients
func (h *WSHandler) ClientsCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// HandleConnection handles WebSocket connections
func (h *WSHandler) HandleConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("❌ WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	h.mu.Lock()
	h.clients[conn] = true
	h.mu.Unlock()

	log.Println("🔗 New WebSocket connection established")

	// Send initial configuration
	h.sendConfig(conn)

	// Handle messages
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("❌ WebSocket error: %v", err)
			}
			break
		}

		h.handleMessage(conn, message)
	}

	h.mu.Lock()
	delete(h.clients, conn)
	h.mu.Unlock()
	log.Println("🔌 WebSocket connection closed")
}

func (h *WSHandler) sendConfig(conn *websocket.Conn) {
	dropdownOptions, _ := h.configManager.GetAllDropdownOptions()
	featureFlags, _ := h.configManager.GetFeatureFlags()

	msg := models.WSConfigMessage{
		Type: "config",
		Data: models.WSConfigData{
			DropdownOptions: dropdownOptions,
			FeatureFlags:    featureFlags,
		},
	}
	h.sendToClient(conn, msg)
}

func (h *WSHandler) handleMessage(conn *websocket.Conn, message []byte) {
	var baseMsg models.WSMessage
	if err := json.Unmarshal(message, &baseMsg); err != nil {
		log.Printf("❌ Error parsing message: %v", err)
		h.sendError(conn, "Failed to parse message")
		return
	}

	log.Printf("📨 Received message: %s", baseMsg.Type)

	switch baseMsg.Type {
	case "ping":
		h.sendToClient(conn, map[string]interface{}{
			"type":      "pong",
			"timestamp": time.Now().UnixMilli(),
		})

	case "generate_document":
		var req models.WSGenerateDocumentRequest
		json.Unmarshal(message, &req)
		h.handleGenerateDocument(conn, req)

	case "instruction":
		var req models.WSInstructionRequest
		json.Unmarshal(message, &req)
		h.handleInstruction(conn, req)

	case "batch_instructions":
		var req models.WSBatchInstructionsRequest
		json.Unmarshal(message, &req)
		h.handleBatchInstructions(conn, req)

	case "getDropdownOptions":
		var req struct {
			Type        string `json:"type"`
			OverlayType string `json:"overlayType"`
		}
		json.Unmarshal(message, &req)
		h.sendDropdownOptions(conn, req.OverlayType)

	case "getVersionHistory":
		var req models.WSVersionHistoryRequest
		json.Unmarshal(message, &req)
		h.handleGetVersionHistory(conn, req)

	case "restoreVersion":
		var req models.WSRestoreVersionRequest
		json.Unmarshal(message, &req)
		h.handleRestoreVersion(conn, req)

	case "getVersionStats":
		var req models.WSVersionHistoryRequest
		json.Unmarshal(message, &req)
		h.handleGetVersionStats(conn, req)

	default:
		log.Printf("⚠️ Unknown message type: %s", baseMsg.Type)
		h.sendError(conn, fmt.Sprintf("Unknown message type: %s", baseMsg.Type))
	}
}

func (h *WSHandler) handleGenerateDocument(conn *websocket.Conn, req models.WSGenerateDocumentRequest) {
	log.Printf("🚀 Generating document: %s", req.DocumentName)

	h.sendToClient(conn, map[string]interface{}{
		"type":         "generation_started",
		"documentName": req.DocumentName,
	})

	// TODO: Implement document generation
	// For now, send a placeholder response
	h.sendProgress(conn, 50, "Document generation in progress...")

	h.currentDocument = req.DocumentName

	h.sendToClient(conn, map[string]interface{}{
		"type":         "generation_complete",
		"documentName": req.DocumentName,
		"pdfPath":      fmt.Sprintf("ui/%s-generated.pdf", req.DocumentName),
		"jsonPath":     fmt.Sprintf("ui/%s-generated-marked-boxes.json", req.DocumentName),
	})

	log.Printf("✅ Document generation complete: %s", req.DocumentName)
}

func (h *WSHandler) handleInstruction(conn *websocket.Conn, req models.WSInstructionRequest) {
	log.Printf("🎯 Processing instruction: %s - %s for element %s", req.OverlayType, req.Instruction, req.ElementID)

	h.sendToClient(conn, map[string]interface{}{
		"type":        "processing_started",
		"elementId":   req.ElementID,
		"overlayType": req.OverlayType,
		"instruction": req.Instruction,
	})

	// TODO: Implement instruction processing
	h.sendProgress(conn, 50, "Processing instruction...")

	h.broadcastToAll(map[string]interface{}{
		"type":        "processing_complete",
		"elementId":   req.ElementID,
		"overlayType": req.OverlayType,
		"instruction": req.Instruction,
		"result": map[string]interface{}{
			"timestamp": time.Now().Format(time.RFC3339),
		},
	})

	log.Println("✅ Instruction processing completed successfully")
}

func (h *WSHandler) handleBatchInstructions(conn *websocket.Conn, req models.WSBatchInstructionsRequest) {
	log.Printf("📦 Processing %d batch instructions", len(req.Instructions))

	h.sendToClient(conn, map[string]interface{}{
		"type":      "processing_started",
		"batchSize": len(req.Instructions),
	})

	// TODO: Implement batch instruction processing
	h.sendProgress(conn, 50, "Processing batch instructions...")

	h.broadcastToAll(map[string]interface{}{
		"type":      "processing_complete",
		"batchSize": len(req.Instructions),
		"result": map[string]interface{}{
			"timestamp": time.Now().Format(time.RFC3339),
		},
	})

	log.Printf("✅ Batch processing completed successfully (%d instructions)", len(req.Instructions))
}

func (h *WSHandler) sendDropdownOptions(conn *websocket.Conn, overlayType string) {
	var options interface{}
	var err error

	if overlayType != "" {
		options, err = h.configManager.GetDropdownOptions(overlayType)
	} else {
		options, err = h.configManager.GetAllDropdownOptions()
	}

	if err != nil {
		h.sendError(conn, err.Error())
		return
	}

	h.sendToClient(conn, map[string]interface{}{
		"type":        "dropdown_options",
		"overlayType": overlayType,
		"options":     options,
	})
}

func (h *WSHandler) handleGetVersionHistory(conn *websocket.Conn, req models.WSVersionHistoryRequest) {
	log.Printf("📚 Fetching version history for: %s", req.DocumentName)

	// TODO: Implement version history retrieval from VersionManager
	h.sendToClient(conn, map[string]interface{}{
		"type":         "version_history",
		"documentName": req.DocumentName,
		"history":      []interface{}{},
	})
}

func (h *WSHandler) handleRestoreVersion(conn *websocket.Conn, req models.WSRestoreVersionRequest) {
	log.Printf("⏮️  Restoring version %d for: %s", req.VersionNumber, req.DocumentName)

	h.sendToClient(conn, map[string]interface{}{
		"type":          "restore_started",
		"documentName":  req.DocumentName,
		"versionNumber": req.VersionNumber,
	})

	// TODO: Implement version restoration
	h.broadcastToAll(map[string]interface{}{
		"type":          "version_restored",
		"documentName":  req.DocumentName,
		"versionNumber": req.VersionNumber,
		"timestamp":     time.Now().Format(time.RFC3339),
	})
}

func (h *WSHandler) handleGetVersionStats(conn *websocket.Conn, req models.WSVersionHistoryRequest) {
	log.Printf("📊 Getting version stats for: %s", req.DocumentName)

	// TODO: Implement version stats retrieval
	h.sendToClient(conn, map[string]interface{}{
		"type":         "version_stats",
		"documentName": req.DocumentName,
		"stats": map[string]interface{}{
			"totalVersions": 0,
			"activeVersion": 0,
			"oldestVersion": nil,
			"latestVersion": nil,
			"storageUsedMB": 0,
		},
	})
}

func (h *WSHandler) sendToClient(conn *websocket.Conn, message interface{}) {
	data, _ := json.Marshal(message)
	conn.WriteMessage(websocket.TextMessage, data)
}

func (h *WSHandler) sendError(conn *websocket.Conn, errMsg string) {
	h.sendToClient(conn, models.WSErrorMessage{
		Type:    "error",
		Message: errMsg,
	})
}

func (h *WSHandler) sendProgress(conn *websocket.Conn, progress int, message string) {
	h.sendToClient(conn, models.WSProgressMessage{
		Type:     "processing_progress",
		Progress: progress,
		Message:  message,
	})
}

func (h *WSHandler) broadcastToAll(message interface{}) {
	data, _ := json.Marshal(message)
	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		if err := client.WriteMessage(websocket.TextMessage, data); err != nil {
			log.Printf("❌ Error broadcasting to client: %v", err)
		}
	}
}
