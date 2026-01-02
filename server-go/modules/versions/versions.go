package versions

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"sort"
	"time"

	bolt "go.etcd.io/bbolt"

	"server-go/config"
	"server-go/models"
)

var versionBucket = []byte("versions")

// Manager handles version management
type Manager struct {
	db            *bolt.DB
	configManager *config.Manager
	storagePath   string
}

// New creates a new version manager
func New(cm *config.Manager, dataDir string) (*Manager, error) {
	dbPath := filepath.Join(dataDir, "versions.db")
	storagePath := filepath.Join(dataDir, "version-files")

	if err := os.MkdirAll(storagePath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create storage directory: %w", err)
	}

	db, err := bolt.Open(dbPath, 0600, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Create bucket if it doesn't exist
	err = db.Update(func(tx *bolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists(versionBucket)
		return err
	})
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to create bucket: %w", err)
	}

	log.Println("✅ Version database initialized")
	return &Manager{
		db:            db,
		configManager: cm,
		storagePath:   storagePath,
	}, nil
}

// Close closes the database
func (m *Manager) Close() error {
	return m.db.Close()
}

// generateHash generates a unique hash for version identification
func (m *Manager) generateHash() string {
	data := fmt.Sprintf("%d-%d", time.Now().UnixNano(), os.Getpid())
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:8])
}

// getCurrentVersionNumber gets the current version number for a document
func (m *Manager) getCurrentVersionNumber(documentName string) (int, error) {
	var maxVersion int

	err := m.db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(versionBucket)
		c := b.Cursor()

		prefix := []byte(documentName + "-")
		for k, v := c.Seek(prefix); k != nil && len(k) >= len(prefix) && string(k[:len(prefix)]) == string(prefix); k, v = c.Next() {
			var ver models.Version
			if err := json.Unmarshal(v, &ver); err == nil {
				if ver.VersionNumber > maxVersion {
					maxVersion = ver.VersionNumber
				}
			}
		}
		return nil
	})

	return maxVersion, err
}

// SaveVersion saves a new version after an instruction is processed
func (m *Manager) SaveVersion(data models.Version) (*models.Version, error) {
	// Get current version number
	currentVersion, err := m.getCurrentVersionNumber(data.DocumentName)
	if err != nil {
		return nil, err
	}

	data.VersionNumber = currentVersion + 1
	data.VersionHash = m.generateHash()
	data.Timestamp = time.Now().Format(time.RFC3339)
	data.ID = fmt.Sprintf("%s-%d", data.DocumentName, data.VersionNumber)
	data.IsActive = true

	// Create version storage directory
	versionDir := filepath.Join(m.storagePath, data.ID)
	if err := os.MkdirAll(versionDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create version directory: %w", err)
	}

	// Copy files to version storage
	if data.XMLPath != "" {
		if err := copyFile(data.XMLPath, filepath.Join(versionDir, "document.xml")); err != nil {
			log.Printf("Warning: Failed to copy XML file: %v", err)
		}
	}
	if data.PDFPath != "" {
		if err := copyFile(data.PDFPath, filepath.Join(versionDir, "document.pdf")); err != nil {
			log.Printf("Warning: Failed to copy PDF file: %v", err)
		}
	}
	if data.JSONPath != "" {
		if err := copyFile(data.JSONPath, filepath.Join(versionDir, "coordinates.json")); err != nil {
			log.Printf("Warning: Failed to copy JSON file: %v", err)
		}
	}

	// Mark previous versions as inactive
	if err := m.markPreviousVersionsInactive(data.DocumentName); err != nil {
		log.Printf("Warning: Failed to mark previous versions inactive: %v", err)
	}

	// Save to database
	err = m.db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(versionBucket)
		encoded, err := json.Marshal(data)
		if err != nil {
			return err
		}
		return b.Put([]byte(data.ID), encoded)
	})

	if err != nil {
		return nil, fmt.Errorf("failed to save version: %w", err)
	}

	log.Printf("💾 Version %d saved for %s", data.VersionNumber, data.DocumentName)
	return &data, nil
}

func (m *Manager) markPreviousVersionsInactive(documentName string) error {
	return m.db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(versionBucket)
		c := b.Cursor()

		prefix := []byte(documentName + "-")
		for k, v := c.Seek(prefix); k != nil && len(k) >= len(prefix) && string(k[:len(prefix)]) == string(prefix); k, v = c.Next() {
			var ver models.Version
			if err := json.Unmarshal(v, &ver); err == nil {
				ver.IsActive = false
				encoded, _ := json.Marshal(ver)
				b.Put(k, encoded)
			}
		}
		return nil
	})
}

// GetVersionHistory gets version history for a document
func (m *Manager) GetVersionHistory(documentName string, limit int) ([]models.Version, error) {
	var versions []models.Version

	err := m.db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(versionBucket)
		c := b.Cursor()

		prefix := []byte(documentName + "-")
		for k, v := c.Seek(prefix); k != nil && len(k) >= len(prefix) && string(k[:len(prefix)]) == string(prefix); k, v = c.Next() {
			var ver models.Version
			if err := json.Unmarshal(v, &ver); err == nil {
				versions = append(versions, ver)
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	// Sort by version number (descending)
	sort.Slice(versions, func(i, j int) bool {
		return versions[i].VersionNumber > versions[j].VersionNumber
	})

	// Apply limit
	if limit > 0 && len(versions) > limit {
		versions = versions[:limit]
	}

	return versions, nil
}

// GetVersion gets a specific version by version number
func (m *Manager) GetVersion(documentName string, versionNumber int) (*models.Version, error) {
	id := fmt.Sprintf("%s-%d", documentName, versionNumber)

	var version models.Version
	err := m.db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(versionBucket)
		v := b.Get([]byte(id))
		if v == nil {
			return fmt.Errorf("version not found")
		}
		return json.Unmarshal(v, &version)
	})

	if err != nil {
		return nil, err
	}
	return &version, nil
}

// RestoreVersion restores a specific version
func (m *Manager) RestoreVersion(documentName string, targetVersion int) (*models.Version, error) {
	version, err := m.GetVersion(documentName, targetVersion)
	if err != nil {
		return nil, err
	}

	versionDir := filepath.Join(m.storagePath, version.ID)

	// Copy files back from version storage
	if version.XMLPath != "" {
		src := filepath.Join(versionDir, "document.xml")
		if _, err := os.Stat(src); err == nil {
			copyFile(src, version.XMLPath)
		}
	}
	if version.PDFPath != "" {
		src := filepath.Join(versionDir, "document.pdf")
		if _, err := os.Stat(src); err == nil {
			copyFile(src, version.PDFPath)
		}
	}
	if version.JSONPath != "" {
		src := filepath.Join(versionDir, "coordinates.json")
		if _, err := os.Stat(src); err == nil {
			copyFile(src, version.JSONPath)
		}
	}

	// Mark this version as active
	m.markPreviousVersionsInactive(documentName)
	version.IsActive = true

	err = m.db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket(versionBucket)
		encoded, _ := json.Marshal(version)
		return b.Put([]byte(version.ID), encoded)
	})

	log.Printf("⏮️  Restored version %d for %s", targetVersion, documentName)
	return version, err
}

// GetVersionStats gets version statistics for a document
func (m *Manager) GetVersionStats(documentName string) (map[string]interface{}, error) {
	versions, err := m.GetVersionHistory(documentName, 0)
	if err != nil {
		return nil, err
	}

	stats := map[string]interface{}{
		"totalVersions": len(versions),
		"activeVersion": 0,
		"oldestVersion": nil,
		"latestVersion": nil,
		"storageUsedMB": 0,
	}

	for _, v := range versions {
		if v.IsActive {
			stats["activeVersion"] = v.VersionNumber
		}
	}

	if len(versions) > 0 {
		stats["latestVersion"] = versions[0].VersionNumber
		stats["oldestVersion"] = versions[len(versions)-1].VersionNumber
	}

	return stats, nil
}

func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}
