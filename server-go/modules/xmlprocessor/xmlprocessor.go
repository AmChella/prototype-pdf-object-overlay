package xmlprocessor

import (
	"fmt"
	"os"
	"strings"

	"github.com/antchfx/xmlquery"

	"server-go/config"
	"server-go/models"
)

// Processor handles XML document processing
type Processor struct {
	configManager *config.Manager
	document      *xmlquery.Node
	xmlPath       string
}

// New creates a new XML processor
func New(cm *config.Manager) *Processor {
	return &Processor{
		configManager: cm,
	}
}

// LoadDocument loads an XML document from a file
func (p *Processor) LoadDocument(xmlPath string) error {
	file, err := os.Open(xmlPath)
	if err != nil {
		return fmt.Errorf("failed to open XML file: %w", err)
	}
	defer file.Close()

	doc, err := xmlquery.Parse(file)
	if err != nil {
		return fmt.Errorf("failed to parse XML file: %w", err)
	}

	p.document = doc
	p.xmlPath = xmlPath
	return nil
}

// SaveDocument saves the XML document to a file
func (p *Processor) SaveDocument(xmlPath string) error {
	if p.document == nil {
		return fmt.Errorf("no document loaded")
	}

	if xmlPath == "" {
		xmlPath = p.xmlPath
	}

	output := p.document.OutputXML(true)
	if err := os.WriteFile(xmlPath, []byte(output), 0644); err != nil {
		return fmt.Errorf("failed to write XML file: %w", err)
	}

	return nil
}

// ApplyInstruction applies an instruction to the XML document
func (p *Processor) ApplyInstruction(elementID, overlayType, action string, instructionValue string) error {
	if p.document == nil {
		return fmt.Errorf("no document loaded")
	}

	// Get processing rule from config
	rule, err := p.configManager.GetXMLProcessingRule(overlayType, action)
	if err != nil {
		return fmt.Errorf("failed to get processing rule: %w", err)
	}
	if rule == nil {
		return fmt.Errorf("no processing rule found for %s/%s", overlayType, action)
	}

	// Apply the rule
	return p.applyRule(elementID, rule, instructionValue)
}

func (p *Processor) applyRule(elementID string, rule *models.ProcessingRule, instructionValue string) error {
	// Replace {elementId} in XPath
	xpath := strings.ReplaceAll(rule.XPath, "{elementId}", elementID)

	// Find nodes matching the XPath
	nodes, err := xmlquery.QueryAll(p.document, xpath)
	if err != nil {
		return fmt.Errorf("XPath query failed: %w", err)
	}

	if len(nodes) == 0 {
		return fmt.Errorf("no elements found matching XPath: %s", xpath)
	}

	// Apply operation to each matching node
	for _, node := range nodes {
		if err := p.applyOperation(node, rule, instructionValue); err != nil {
			return err
		}
	}

	return nil
}

func (p *Processor) applyOperation(node *xmlquery.Node, rule *models.ProcessingRule, instructionValue string) error {
	switch rule.Operation {
	case "setAttribute":
		value := rule.Value
		if instructionValue != "" {
			value = instructionValue
		}
		// Set attribute by modifying the node
		p.setAttribute(node, rule.Attribute, value)
		return nil

	case "removeAttribute":
		p.removeAttribute(node, rule.Attribute)
		return nil

	case "removeElement":
		p.removeElement(node)
		return nil

	case "insertElement":
		// TODO: Implement element insertion
		return nil

	default:
		return fmt.Errorf("unknown operation: %s", rule.Operation)
	}
}

func (p *Processor) setAttribute(node *xmlquery.Node, name, value string) {
	// Find existing attribute
	for i := range node.Attr {
		if node.Attr[i].Name.Local == name {
			node.Attr[i].Value = value
			return
		}
	}
	// Add new attribute using SetAttr helper
	xmlquery.AddAttr(node, name, value)
}

func (p *Processor) removeAttribute(node *xmlquery.Node, name string) {
	for i := 0; i < len(node.Attr); i++ {
		if node.Attr[i].Name.Local == name {
			node.Attr = append(node.Attr[:i], node.Attr[i+1:]...)
			return
		}
	}
}

func (p *Processor) removeElement(node *xmlquery.Node) {
	if node.Parent != nil {
		xmlquery.RemoveFromTree(node)
	}
}

// GetElementInfo returns information about an element
func (p *Processor) GetElementInfo(elementID string) (map[string]interface{}, error) {
	if p.document == nil {
		return nil, fmt.Errorf("no document loaded")
	}

	// Try different XPath patterns
	patterns := []string{
		fmt.Sprintf("//*[@id='%s']", elementID),
		fmt.Sprintf("//*[@refid='%s']", elementID),
	}

	for _, xpath := range patterns {
		node, err := xmlquery.Query(p.document, xpath)
		if err != nil {
			continue
		}
		if node != nil {
			return p.nodeToMap(node), nil
		}
	}

	return nil, fmt.Errorf("element not found: %s", elementID)
}

func (p *Processor) nodeToMap(node *xmlquery.Node) map[string]interface{} {
	result := make(map[string]interface{})
	result["tagName"] = node.Data

	attrs := make(map[string]string)
	for _, attr := range node.Attr {
		attrs[attr.Name.Local] = attr.Value
	}
	result["attributes"] = attrs

	return result
}
