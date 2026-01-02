package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"server-go/models"
)

// Manager handles configuration loading and access
type Manager struct {
	config     *models.ServerConfig
	configPath string
	mu         sync.RWMutex
}

// NewManager creates a new configuration manager
func NewManager(configPath string) *Manager {
	return &Manager{
		configPath: configPath,
	}
}

// LoadConfig loads the configuration from the JSON file
func (m *Manager) LoadConfig() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	data, err := os.ReadFile(m.configPath)
	if err != nil {
		return fmt.Errorf("failed to read config file: %w", err)
	}

	var config models.ServerConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return fmt.Errorf("failed to parse config file: %w", err)
	}

	m.config = &config
	fmt.Println("✅ Configuration loaded successfully")
	return nil
}

// GetConfig returns the full configuration
func (m *Manager) GetConfig() (*models.ServerConfig, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.config == nil {
		return nil, fmt.Errorf("configuration not loaded")
	}
	return m.config, nil
}

// GetDropdownOptions returns dropdown options for a specific overlay type
func (m *Manager) GetDropdownOptions(overlayType string) ([]models.DropdownOption, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.config == nil {
		return nil, fmt.Errorf("configuration not loaded")
	}

	options, ok := m.config.DropdownOptions[overlayType]
	if !ok {
		return nil, nil
	}
	return options, nil
}

// GetAllDropdownOptions returns all dropdown options
func (m *Manager) GetAllDropdownOptions() (map[string][]models.DropdownOption, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.config == nil {
		return nil, fmt.Errorf("configuration not loaded")
	}
	return m.config.DropdownOptions, nil
}

// GetFeatureFlags returns the feature flags
func (m *Manager) GetFeatureFlags() (models.FeatureFlags, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.config == nil {
		return models.FeatureFlags{}, fmt.Errorf("configuration not loaded")
	}
	return m.config.FeatureFlags, nil
}

// GetXMLProcessingRule returns an XML processing rule
func (m *Manager) GetXMLProcessingRule(overlayType, action string) (*models.ProcessingRule, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.config == nil {
		return nil, fmt.Errorf("configuration not loaded")
	}

	rules, ok := m.config.XMLProcessingRules[overlayType]
	if !ok {
		return nil, nil
	}

	rule, ok := rules[action]
	if !ok {
		return nil, nil
	}
	return &rule, nil
}

// GetTexConversionRule returns a TeX conversion rule
func (m *Manager) GetTexConversionRule(overlayType, ruleKey string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.config == nil {
		return "", fmt.Errorf("configuration not loaded")
	}

	rules, ok := m.config.TexConversionRules[overlayType]
	if !ok {
		return "", nil
	}

	rule, ok := rules[ruleKey]
	if !ok {
		// Try default
		return rules["default"], nil
	}
	return rule, nil
}

// GetFileSettings returns file settings
func (m *Manager) GetFileSettings() (*models.FileSettings, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.config == nil {
		return nil, fmt.Errorf("configuration not loaded")
	}
	return &m.config.FileSettings, nil
}

// GetFilePath returns a resolved file path
func (m *Manager) GetFilePath(fileKey string) (string, error) {
	settings, err := m.GetFileSettings()
	if err != nil {
		return "", err
	}

	var path string
	switch fileKey {
	case "xmlInput":
		path = settings.XMLInput
	case "texOutput":
		path = settings.TexOutput
	case "pdfOutput":
		path = settings.PDFOutput
	case "jsonOutput":
		path = settings.JSONOutput
	case "uiOutputDir":
		path = settings.UIOutputDir
	default:
		return "", fmt.Errorf("unknown file key: %s", fileKey)
	}

	if path == "" {
		return "", nil
	}

	cwd, _ := os.Getwd()
	return filepath.Join(cwd, path), nil
}

// SaveConfig saves the current configuration to disk
func (m *Manager) SaveConfig() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.config == nil {
		return fmt.Errorf("configuration not loaded")
	}

	data, err := json.MarshalIndent(m.config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.WriteFile(m.configPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	fmt.Println("✅ Configuration saved successfully")
	return nil
}

// ValidateConfig validates the configuration
func (m *Manager) ValidateConfig() error {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.config == nil {
		return fmt.Errorf("configuration not loaded")
	}

	// Check required sections
	if m.config.DropdownOptions == nil {
		return fmt.Errorf("missing configuration section: dropdownOptions")
	}
	if m.config.XMLProcessingRules == nil {
		return fmt.Errorf("missing configuration section: xmlProcessingRules")
	}
	if m.config.TexConversionRules == nil {
		return fmt.Errorf("missing configuration section: texConversionRules")
	}

	fmt.Println("✅ Configuration validation passed")
	return nil
}
