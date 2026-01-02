package s3client

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// Config represents S3/MinIO configuration
type Config struct {
	Endpoint  string `json:"endpoint"`
	AccessKey string `json:"accessKey"`
	SecretKey string `json:"secretKey"`
	Bucket    string `json:"bucket"`
	UseSSL    bool   `json:"useSSL"`
}

// Client wraps MinIO client for S3 operations
type Client struct {
	minioClient *minio.Client
	bucket      string
	config      *Config
}

// New creates a new S3 client from config file
func New(configPath string) (*Client, error) {
	// Read config file
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read S3 config: %w", err)
	}

	var config Config
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse S3 config: %w", err)
	}

	return NewWithConfig(&config)
}

// NewWithConfig creates a new S3 client from config struct
func NewWithConfig(config *Config) (*Client, error) {
	// Initialize MinIO client
	minioClient, err := minio.New(config.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(config.AccessKey, config.SecretKey, ""),
		Secure: config.UseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create MinIO client: %w", err)
	}

	log.Printf("✅ S3 client connected to %s", config.Endpoint)

	return &Client{
		minioClient: minioClient,
		bucket:      config.Bucket,
		config:      config,
	}, nil
}

// ArticleFiles represents the PDF and JSON files for an article
type ArticleFiles struct {
	JournalID string `json:"journalId"`
	ArticleID string `json:"articleId"`
	PDFData   []byte `json:"pdfData,omitempty"`
	JSONData  []byte `json:"jsonData,omitempty"`
	PDFPath   string `json:"pdfPath,omitempty"`
	JSONPath  string `json:"jsonPath,omitempty"`
}

// FetchArticle downloads PDF and JSON files for a given journal and article ID
func (c *Client) FetchArticle(ctx context.Context, journalID, articleID string) (*ArticleFiles, error) {
	// Construct S3 paths
	basePath := fmt.Sprintf("%s/%s", journalID, articleID)
	pdfPath := fmt.Sprintf("%s/%s_%s.pdf", basePath, journalID, articleID)
	jsonPath := fmt.Sprintf("%s/%s_%s-marked-boxes.json", basePath, journalID, articleID)

	log.Printf("📥 Fetching article: %s/%s", journalID, articleID)
	log.Printf("   PDF path: %s", pdfPath)
	log.Printf("   JSON path: %s", jsonPath)

	result := &ArticleFiles{
		JournalID: journalID,
		ArticleID: articleID,
		PDFPath:   pdfPath,
		JSONPath:  jsonPath,
	}

	// Download PDF
	pdfData, err := c.downloadFile(ctx, pdfPath)
	if err != nil {
		return nil, fmt.Errorf("failed to download PDF: %w", err)
	}
	result.PDFData = pdfData
	log.Printf("   ✅ PDF downloaded: %d bytes", len(pdfData))

	// Download JSON
	jsonData, err := c.downloadFile(ctx, jsonPath)
	if err != nil {
		return nil, fmt.Errorf("failed to download JSON: %w", err)
	}
	result.JSONData = jsonData
	log.Printf("   ✅ JSON downloaded: %d bytes", len(jsonData))

	return result, nil
}

// downloadFile downloads a file from S3
func (c *Client) downloadFile(ctx context.Context, objectPath string) ([]byte, error) {
	obj, err := c.minioClient.GetObject(ctx, c.bucket, objectPath, minio.GetObjectOptions{})
	if err != nil {
		return nil, err
	}
	defer obj.Close()

	data, err := io.ReadAll(obj)
	if err != nil {
		return nil, err
	}

	return data, nil
}

// SaveToLocal saves article files to local directory with original S3 filenames
func (c *Client) SaveToLocal(files *ArticleFiles, outputDir string) (pdfPath, jsonPath string, err error) {
	// Create output directory matching S3 path structure
	articleDir := filepath.Join(outputDir, files.JournalID, files.ArticleID)
	if err := os.MkdirAll(articleDir, 0755); err != nil {
		return "", "", fmt.Errorf("failed to create directory: %w", err)
	}

	// Use original filenames: JID_AID.pdf and JID_AID-marked-boxes.json
	pdfFilename := fmt.Sprintf("%s_%s.pdf", files.JournalID, files.ArticleID)
	jsonFilename := fmt.Sprintf("%s_%s-marked-boxes.json", files.JournalID, files.ArticleID)

	// Write PDF
	pdfPath = filepath.Join(articleDir, pdfFilename)
	if err := os.WriteFile(pdfPath, files.PDFData, 0644); err != nil {
		return "", "", fmt.Errorf("failed to write PDF: %w", err)
	}

	// Write JSON
	jsonPath = filepath.Join(articleDir, jsonFilename)
	if err := os.WriteFile(jsonPath, files.JSONData, 0644); err != nil {
		return "", "", fmt.Errorf("failed to write JSON: %w", err)
	}

	log.Printf("📁 Files saved to: %s", articleDir)
	log.Printf("   PDF: %s", pdfFilename)
	log.Printf("   JSON: %s", jsonFilename)
	return pdfPath, jsonPath, nil
}

// CheckConnection verifies the S3 connection and bucket access
func (c *Client) CheckConnection(ctx context.Context) error {
	exists, err := c.minioClient.BucketExists(ctx, c.bucket)
	if err != nil {
		return fmt.Errorf("failed to check bucket: %w", err)
	}
	if !exists {
		return fmt.Errorf("bucket '%s' does not exist", c.bucket)
	}
	return nil
}

// ListArticles lists articles in a journal directory
func (c *Client) ListArticles(ctx context.Context, journalID string) ([]string, error) {
	prefix := journalID + "/"
	articles := make(map[string]bool)

	for obj := range c.minioClient.ListObjects(ctx, c.bucket, minio.ListObjectsOptions{
		Prefix:    prefix,
		Recursive: false,
	}) {
		if obj.Err != nil {
			return nil, obj.Err
		}
		// Extract article ID from path
		relPath := obj.Key[len(prefix):]
		if idx := len(relPath) - 1; idx > 0 && relPath[idx] == '/' {
			articles[relPath[:idx]] = true
		}
	}

	result := make([]string, 0, len(articles))
	for article := range articles {
		result = append(result, article)
	}
	return result, nil
}
