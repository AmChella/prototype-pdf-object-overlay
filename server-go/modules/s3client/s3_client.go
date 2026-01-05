package s3client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"

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

// FileData represents a single downloaded file
type FileData struct {
	Filename     string `json:"filename"`
	RelativePath string `json:"relativePath"` // Path relative to article base (preserves subdirectory structure)
	Data         []byte `json:"data,omitempty"`
	S3Path       string `json:"s3Path"`
}

// ArticleFiles represents all files for an article
type ArticleFiles struct {
	JournalID string               `json:"journalId"`
	ArticleID string               `json:"articleId"`
	Files     map[string]*FileData `json:"files"` // Map of filename to file data
	PDFData   []byte               `json:"pdfData,omitempty"`
	JSONData  []byte               `json:"jsonData,omitempty"`
	PDFPath   string               `json:"pdfPath,omitempty"`
	JSONPath  string               `json:"jsonPath,omitempty"`
}

// FetchArticle downloads ALL files for a given journal and article ID
func (c *Client) FetchArticle(ctx context.Context, journalID, articleID string) (*ArticleFiles, error) {
	// Construct S3 base path for the article
	basePath := fmt.Sprintf("%s/%s/", journalID, articleID)

	log.Printf("📥 Fetching article: %s/%s", journalID, articleID)
	log.Printf("   Listing all files in: %s", basePath)

	result := &ArticleFiles{
		JournalID: journalID,
		ArticleID: articleID,
		Files:     make(map[string]*FileData),
	}

	// List all files in the article directory
	objectCh := c.minioClient.ListObjects(ctx, c.bucket, minio.ListObjectsOptions{
		Prefix:    basePath,
		Recursive: true,
	})

	var filesToDownload []string
	for obj := range objectCh {
		if obj.Err != nil {
			return nil, fmt.Errorf("failed to list objects: %w", obj.Err)
		}
		// Skip if it's a directory marker (ends with /)
		if obj.Key != "" && obj.Key[len(obj.Key)-1] != '/' {
			filesToDownload = append(filesToDownload, obj.Key)
		}
	}

	if len(filesToDownload) == 0 {
		return nil, fmt.Errorf("no files found for article %s/%s", journalID, articleID)
	}

	log.Printf("   Found %d files to download", len(filesToDownload))

	// Download all files
	for _, s3Path := range filesToDownload {
		filename := filepath.Base(s3Path)
		// Calculate relative path from article base (e.g., "subdir/file.txt" or just "file.txt")
		relativePath := strings.TrimPrefix(s3Path, basePath)
		log.Printf("   📥 Downloading: %s", relativePath)

		data, err := c.downloadFile(ctx, s3Path)
		if err != nil {
			return nil, fmt.Errorf("failed to download %s: %w", relativePath, err)
		}

		result.Files[relativePath] = &FileData{
			Filename:     filename,
			RelativePath: relativePath,
			Data:         data,
			S3Path:       s3Path,
		}

		log.Printf("   ✅ %s downloaded: %d bytes", relativePath, len(data))

		// For backwards compatibility, also set PDFData and JSONData
		pdfFilename := fmt.Sprintf("%s_%s.pdf", journalID, articleID)
		jsonFilename := fmt.Sprintf("%s_%s-marked-boxes.json", journalID, articleID)

		if filename == pdfFilename {
			result.PDFData = data
			result.PDFPath = s3Path
		} else if filename == jsonFilename {
			result.JSONData = data
			result.JSONPath = s3Path
		}
	}

	log.Printf("✅ All %d files downloaded for article: %s/%s", len(result.Files), journalID, articleID)

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

// SaveToLocal saves ALL article files to local directory preserving S3 directory structure
func (c *Client) SaveToLocal(files *ArticleFiles, outputDir string) (pdfPath, jsonPath string, err error) {
	// Create base output directory matching S3 path structure
	articleDir := filepath.Join(outputDir, files.JournalID, files.ArticleID)
	if err := os.MkdirAll(articleDir, 0755); err != nil {
		return "", "", fmt.Errorf("failed to create directory: %w", err)
	}

	// Expected PDF and JSON filenames for return values
	pdfFilename := fmt.Sprintf("%s_%s.pdf", files.JournalID, files.ArticleID)
	jsonFilename := fmt.Sprintf("%s_%s-marked-boxes.json", files.JournalID, files.ArticleID)

	// Write ALL files to local directory, preserving subdirectory structure
	savedCount := 0
	for _, fileData := range files.Files {
		// Use RelativePath to preserve directory structure (e.g., "images/fig1.png")
		localPath := filepath.Join(articleDir, fileData.RelativePath)

		// Create subdirectories if needed
		localDir := filepath.Dir(localPath)
		if err := os.MkdirAll(localDir, 0755); err != nil {
			return "", "", fmt.Errorf("failed to create subdirectory for %s: %w", fileData.RelativePath, err)
		}

		if err := os.WriteFile(localPath, fileData.Data, 0644); err != nil {
			return "", "", fmt.Errorf("failed to write %s: %w", fileData.RelativePath, err)
		}
		savedCount++
		log.Printf("   💾 Saved: %s (%d bytes)", fileData.RelativePath, len(fileData.Data))

		// Track PDF and JSON paths for backwards compatibility
		if fileData.Filename == pdfFilename {
			pdfPath = localPath
		} else if fileData.Filename == jsonFilename {
			jsonPath = localPath
		}
	}

	log.Printf("📁 %d files saved to: %s", savedCount, articleDir)
	return pdfPath, jsonPath, nil
}

// UploadFile uploads data to S3 at the specified path
func (c *Client) UploadFile(ctx context.Context, objectPath string, data []byte, contentType string) error {
	reader := bytes.NewReader(data)
	_, err := c.minioClient.PutObject(ctx, c.bucket, objectPath, reader, int64(len(data)), minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return fmt.Errorf("failed to upload to S3: %w", err)
	}
	log.Printf("✅ Uploaded to S3: %s (%d bytes)", objectPath, len(data))
	return nil
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
