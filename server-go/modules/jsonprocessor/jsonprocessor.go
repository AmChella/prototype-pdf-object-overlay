package jsonprocessor

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"server-go/config"
)

// FloatPosition represents a figure/table position entry
type FloatPosition struct {
	ID        string `json:"id"`
	Placement string `json:"placement,omitempty"`
	Page      int    `json:"page,omitempty"`
	Action    string `json:"action,omitempty"`
}

// SatelliteData represents the structure of satellite.json
type SatelliteData struct {
	FloatPositions map[string]FloatPosition `json:"float_positions"`
	// Other fields can be added as needed
	RawData map[string]interface{} `json:"-"` // For preserving unknown fields
}

// Processor handles JSON document processing for satellite.json
type Processor struct {
	configManager *config.Manager
	data          map[string]interface{}
	jsonPath      string
}

// New creates a new JSON processor
func New(cm *config.Manager) *Processor {
	return &Processor{
		configManager: cm,
	}
}

// LoadDocument loads a JSON document from a file
func (p *Processor) LoadDocument(jsonPath string) error {
	data, err := os.ReadFile(jsonPath)
	if err != nil {
		// If file doesn't exist, create empty structure
		if os.IsNotExist(err) {
			p.data = map[string]interface{}{
				"float_positions": make(map[string]interface{}),
			}
			p.jsonPath = jsonPath
			return nil
		}
		return fmt.Errorf("failed to read JSON file: %w", err)
	}

	if err := json.Unmarshal(data, &p.data); err != nil {
		return fmt.Errorf("failed to parse JSON file: %w", err)
	}

	p.jsonPath = jsonPath
	return nil
}

// SaveDocument saves the JSON document to a file
func (p *Processor) SaveDocument(jsonPath string) error {
	if p.data == nil {
		return fmt.Errorf("no document loaded")
	}

	if jsonPath == "" {
		jsonPath = p.jsonPath
	}

	// Ensure directory exists
	dir := filepath.Dir(jsonPath)
	log.Printf("✅ Directory: %s", dir)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	output, err := json.MarshalIndent(p.data, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}

	if err := os.WriteFile(jsonPath, output, 0644); err != nil {
		return fmt.Errorf("failed to write JSON file: %w", err)
	}

	// log.Printf("✅ Saved JSON document to %s", output)

	return nil
}

// ApplyInstruction applies an instruction to the JSON document
// Updates FLOAT_CALLOUT.float_positions[elementID] with the placement value (e.g., "t", "b", "h", "p")
func (p *Processor) ApplyInstruction(elementID, overlayType, action string, instructionValue string) error {
	if p.data == nil {
		return fmt.Errorf("no document loaded")
	}

	// Get or create FLOAT_CALLOUT map
	floatCallout, ok := p.data["FLOAT_CALLOUT"].(map[string]interface{})
	log.Printf("✅ FLOAT_CALLOUT exists: %v", ok)
	if !ok {
		floatCallout = make(map[string]interface{})
		p.data["FLOAT_CALLOUT"] = floatCallout
		log.Printf("✅ Created FLOAT_CALLOUT")
	}

	// Get or create float_positions map inside FLOAT_CALLOUT
	floatPositions, ok := floatCallout["float_positions"].(map[string]interface{})
	log.Printf("✅ float_positions exists: %v", ok)
	if !ok {
		floatPositions = make(map[string]interface{})
		floatCallout["float_positions"] = floatPositions
		log.Printf("✅ Created FLOAT_CALLOUT.float_positions")
	}

	// Map action to placement value
	placementValue := p.actionToPlacement(action)
	if placementValue == "" {
		// If no mapping, use instructionValue or action directly
		if instructionValue != "" {
			placementValue = instructionValue
		} else {
			placementValue = action
		}
	}

	// Update float_positions with simple string value: "fig2": "b"
	floatPositions[elementID] = placementValue
	log.Printf("✅ Updated FLOAT_CALLOUT.float_positions[%s] = %s", elementID, placementValue)

	return nil
}

// actionToPlacement converts action name to placement value
func (p *Processor) actionToPlacement(action string) string {
	switch action {
	case "placement_t":
		return "t"
	case "placement_b":
		return "b"
	case "placement_h":
		return "h"
	case "placement_p":
		return "p"
	default:
		return ""
	}
}

// GetElementInfo returns information about an element from float_positions
func (p *Processor) GetElementInfo(elementID string) (map[string]interface{}, error) {
	if p.data == nil {
		return nil, fmt.Errorf("no document loaded")
	}

	floatPositions, ok := p.data["float_positions"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("no float_positions found")
	}

	entry, ok := floatPositions[elementID].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("element not found: %s", elementID)
	}

	return entry, nil
}

// GetFloatPosition returns the current float position for an element
func (p *Processor) GetFloatPosition(elementID string) (*FloatPosition, error) {
	info, err := p.GetElementInfo(elementID)
	if err != nil {
		return nil, err
	}

	pos := &FloatPosition{
		ID: elementID,
	}

	if placement, ok := info["placement"].(string); ok {
		pos.Placement = placement
	}
	if action, ok := info["action"].(string); ok {
		pos.Action = action
	}

	return pos, nil
}
