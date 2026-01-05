package models

// ServerConfig represents the main configuration structure
type ServerConfig struct {
	FeatureFlags            FeatureFlags                         `json:"featureFlags"`
	DropdownOptions         map[string][]DropdownOption          `json:"dropdownOptions"`
	XMLInstructionTemplates map[string]map[string]string         `json:"xmlInstructionTemplates"`
	XMLProcessingRules      map[string]map[string]ProcessingRule `json:"xmlProcessingRules"`
	TexConversionRules      map[string]map[string]string         `json:"texConversionRules"`
	FileSettings            FileSettings                         `json:"fileSettings"`
}

// FeatureFlags represents feature toggles
type FeatureFlags struct {
	EnableInstructionStack bool `json:"enableInstructionStack"`
	EnableVersioning       bool `json:"enableVersioning"`
}

// DropdownOption represents a single dropdown option
type DropdownOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// ProcessingRule represents an XML processing rule
type ProcessingRule struct {
	XPath     string `json:"xpath"`
	Operation string `json:"operation"`
	Attribute string `json:"attribute"`
	Value     string `json:"value"`
}

// FileSettings represents file path settings
type FileSettings struct {
	XMLInput    string `json:"xmlInput"`
	TexOutput   string `json:"texOutput"`
	PDFOutput   string `json:"pdfOutput"`
	JSONOutput  string `json:"jsonOutput"`
	UIOutputDir string `json:"uiOutputDir"`
}

// WebSocket message types
type WSMessage struct {
	Type string `json:"type"`
}

type WSConfigMessage struct {
	Type string       `json:"type"`
	Data WSConfigData `json:"data"`
}

type WSConfigData struct {
	DropdownOptions map[string][]DropdownOption `json:"dropdownOptions"`
	FeatureFlags    FeatureFlags                `json:"featureFlags"`
}

type WSErrorMessage struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

type WSProgressMessage struct {
	Type     string `json:"type"`
	Progress int    `json:"progress"`
	Message  string `json:"message"`
}

type WSGenerateDocumentRequest struct {
	Type         string `json:"type"`
	DocumentName string `json:"documentName"`
}

type WSInstructionRequest struct {
	Type             string `json:"type"`
	ElementID        string `json:"elementId"`
	OverlayType      string `json:"overlayType"`
	Instruction      string `json:"instruction"`
	InstructionValue string `json:"instructionValue,omitempty"`
	JournalID        string `json:"journalId,omitempty"`
	ArticleID        string `json:"articleId,omitempty"`
	UserID           string `json:"userId,omitempty"`
}

type WSBatchInstructionsRequest struct {
	Type         string                 `json:"type"`
	JournalID    string                 `json:"journalId,omitempty"`
	ArticleID    string                 `json:"articleId,omitempty"`
	Instructions []WSInstructionRequest `json:"instructions"`
	UserID       string                 `json:"userId,omitempty"`
}

type WSVersionHistoryRequest struct {
	Type         string `json:"type"`
	DocumentName string `json:"documentName,omitempty"`
	Limit        int    `json:"limit,omitempty"`
}

type WSRestoreVersionRequest struct {
	Type          string `json:"type"`
	DocumentName  string `json:"documentName,omitempty"`
	VersionNumber int    `json:"versionNumber"`
}

// Version represents a document version
type Version struct {
	ID               string `json:"_id"`
	DocumentName     string `json:"documentName"`
	VersionNumber    int    `json:"versionNumber"`
	VersionHash      string `json:"versionHash"`
	Timestamp        string `json:"timestamp"`
	Instruction      string `json:"instruction"`
	InstructionValue string `json:"instructionValue"`
	ElementID        string `json:"elementId"`
	OverlayType      string `json:"overlayType"`
	XMLPath          string `json:"xmlPath"`
	TexPath          string `json:"texPath"`
	PDFPath          string `json:"pdfPath"`
	JSONPath         string `json:"jsonPath"`
	TemplatePath     string `json:"templatePath"`
	UserID           string `json:"userId"`
	Description      string `json:"description"`
	IsActive         bool   `json:"isActive"`
}
