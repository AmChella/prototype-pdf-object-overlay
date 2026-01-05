package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/gorilla/mux"

	"server-go/config"
	"server-go/handlers"
	"server-go/modules/s3client"
	"server-go/modules/watcher"
)

func main() {
	// Get project root (parent of server-go)
	execPath, _ := os.Getwd()
	projectRoot := filepath.Dir(execPath)
	if filepath.Base(execPath) != "server-go" {
		projectRoot = execPath
	}

	// Port configuration
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	// Load configuration
	configPath := filepath.Join(projectRoot, "server-go", "config", "server-config.json")
	configManager := config.NewManager(configPath)

	if err := configManager.LoadConfig(); err != nil {
		log.Fatalf("❌ Failed to load configuration: %v", err)
	}

	log.Println("📋 Configuration loaded")

	// Validate configuration
	if err := configManager.ValidateConfig(); err != nil {
		log.Printf("⚠️  Configuration validation warning: %v", err)
	}

	// Initialize S3 client
	s3ConfigPath := filepath.Join(projectRoot, "server-go", "config", "s3-config.json")
	var s3Client *s3client.Client
	if _, err := os.Stat(s3ConfigPath); err == nil {
		s3Client, err = s3client.New(s3ConfigPath)
		if err != nil {
			log.Printf("⚠️  S3 client initialization failed: %v (article fetching disabled)", err)
		} else {
			log.Println("📦 S3 client initialized")
		}
	} else {
		log.Println("⚠️  S3 config not found, article fetching disabled")
	}

	// Setup WebSocket handler
	wsHandler := handlers.NewWSHandler(configManager, projectRoot)

	// Setup HTTP handler (with S3 client)
	httpHandler := handlers.NewHTTPHandler(configManager, wsHandler.ClientsCount, s3Client, projectRoot)

	// Setup router
	router := mux.NewRouter()

	// Apply CORS middleware
	router.Use(handlers.CORSMiddleware)

	// Register HTTP routes
	httpHandler.RegisterRoutes(router)

	// WebSocket endpoint
	router.HandleFunc("/ws", wsHandler.HandleConnection)

	// Serve static files
	staticDir := filepath.Join(projectRoot, "ui")
	router.PathPrefix("/").Handler(http.FileServer(http.Dir(staticDir)))

	// Setup file watcher
	fileWatcher, err := watcher.New()
	if err != nil {
		log.Printf("⚠️  Failed to create file watcher: %v", err)
	} else {
		// Watch UI directory for changes
		uiDir := filepath.Join(projectRoot, "ui")
		if err := fileWatcher.AddPath(uiDir); err != nil {
			log.Printf("⚠️  Failed to watch UI directory: %v", err)
		}

		fileWatcher.OnFileChange(func(eventType, filePath string) {
			log.Printf("📁 File %s: %s", eventType, filePath)
			// TODO: Broadcast to WebSocket clients
		})

		fileWatcher.Start()
		defer fileWatcher.Stop()
	}

	// Create HTTP server
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("🚀 PDF Overlay Server running on port %s", port)
		log.Printf("📡 WebSocket server ready for connections")
		log.Printf("🌐 HTTP server: http://localhost:%s", port)

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ Server failed: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("\n🛑 Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("❌ Server forced to shutdown: %v", err)
	}

	log.Println("✅ Server gracefully stopped")
}

func init() {
	// Configure logging
	log.SetFlags(log.Ldate | log.Ltime | log.Lmicroseconds)
	log.SetPrefix("")

	fmt.Println(`
╔══════════════════════════════════════════╗
║     PDF Overlay Server (Go Edition)      ║
╚══════════════════════════════════════════╝
`)
}
