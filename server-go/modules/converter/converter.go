package converter

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"server-go/config"
)

// Converter handles document conversion
type Converter struct {
	configManager *config.Manager
	projectRoot   string
	onOutput      func(outputType, message string)
}

// New creates a new document converter
func New(cm *config.Manager, projectRoot string) *Converter {
	return &Converter{
		configManager: cm,
		projectRoot:   projectRoot,
	}
}

// SetOutputHandler sets the callback for process output
func (c *Converter) SetOutputHandler(handler func(outputType, message string)) {
	c.onOutput = handler
}

// XMLToTex converts an XML file to TeX using the engine
func (c *Converter) XMLToTex(xmlPath, templatePath, outputName string) (string, error) {
	log.Printf("📄 Converting XML to TeX: %s", filepath.Base(xmlPath))

	// Determine output path
	texDir := filepath.Join(c.projectRoot, "TeX")
	if err := os.MkdirAll(texDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create TeX directory: %w", err)
	}

	texPath := filepath.Join(texDir, outputName+".tex")

	// Call the Node.js engine for XML to TeX conversion
	// This uses the existing engine.js for compatibility
	enginePath := filepath.Join(c.projectRoot, "src", "engine.js")

	cmd := exec.Command("node", enginePath, xmlPath, templatePath, texPath)
	cmd.Dir = c.projectRoot

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("XML to TeX conversion failed: %w\nOutput: %s", err, string(output))
	}

	log.Printf("✅ TeX file generated: %s", filepath.Base(texPath))
	return texPath, nil
}

// TexToPdf converts a TeX file to PDF and generates coordinate JSON
func (c *Converter) TexToPdf(texPath, outputName string) (pdfPath, jsonPath string, err error) {
	log.Printf("📄 Compiling PDF: %s", filepath.Base(texPath))

	texDir := filepath.Dir(texPath)

	// Use the tex-to-pdf.js script for compilation
	scriptPath := filepath.Join(c.projectRoot, "src", "tex-to-pdf.js")

	cmd := exec.Command("node", scriptPath, texPath, texDir,
		"--marked-boxes", "--sync-aux", "--keep-aux")
	cmd.Dir = c.projectRoot

	// Stream output
	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()

	if err := cmd.Start(); err != nil {
		return "", "", fmt.Errorf("failed to start PDF compilation: %w", err)
	}

	// Read output
	go c.readOutput(stdout, "stdout")
	go c.readOutput(stderr, "stderr")

	if err := cmd.Wait(); err != nil {
		return "", "", fmt.Errorf("PDF compilation failed: %w", err)
	}

	// Determine output paths
	pdfPath = filepath.Join(texDir, outputName+".pdf")
	jsonPath = filepath.Join(texDir, outputName+"-marked-boxes.json")

	if _, err := os.Stat(pdfPath); os.IsNotExist(err) {
		return "", "", fmt.Errorf("PDF not generated: %s", pdfPath)
	}

	log.Printf("✅ PDF compiled: %s", filepath.Base(pdfPath))
	return pdfPath, jsonPath, nil
}

func (c *Converter) readOutput(reader io.Reader, outputType string) {
	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		line := scanner.Text()
		if c.onOutput != nil && c.isImportantMessage(line) {
			c.onOutput(outputType, line)
		}
	}
}

func (c *Converter) isImportantMessage(message string) bool {
	// Filter out verbose LaTeX output
	importantPrefixes := []string{
		"Pass", "PDF", "Geometry", "Converting", "Generated", "✅", "❌", "⚠️",
	}

	for _, prefix := range importantPrefixes {
		if strings.HasPrefix(message, prefix) {
			return true
		}
	}
	return false
}

// ConvertNdjsonToJson converts NDJSON to JSON format
func (c *Converter) ConvertNdjsonToJson(ndjsonPath, outputPath string) error {
	file, err := os.Open(ndjsonPath)
	if err != nil {
		return fmt.Errorf("failed to open NDJSON file: %w", err)
	}
	defer file.Close()

	var records []map[string]interface{}
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		var record map[string]interface{}
		if err := json.Unmarshal([]byte(line), &record); err != nil {
			log.Printf("Warning: Failed to parse NDJSON line: %s", line)
			continue
		}
		records = append(records, record)
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading NDJSON: %w", err)
	}

	output, err := json.MarshalIndent(records, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}

	if err := os.WriteFile(outputPath, output, 0644); err != nil {
		return fmt.Errorf("failed to write JSON file: %w", err)
	}

	log.Printf("✅ Converted NDJSON to JSON: %s", filepath.Base(outputPath))
	return nil
}

// CopyToUI copies PDF and JSON files to the UI directory
func (c *Converter) CopyToUI(pdfPath, jsonPath string) error {
	uiDir := filepath.Join(c.projectRoot, "ui")
	if err := os.MkdirAll(uiDir, 0755); err != nil {
		return fmt.Errorf("failed to create UI directory: %w", err)
	}

	// Copy PDF
	if err := copyFile(pdfPath, filepath.Join(uiDir, filepath.Base(pdfPath))); err != nil {
		return fmt.Errorf("failed to copy PDF: %w", err)
	}

	// Copy JSON
	if err := copyFile(jsonPath, filepath.Join(uiDir, filepath.Base(jsonPath))); err != nil {
		return fmt.Errorf("failed to copy JSON: %w", err)
	}

	log.Printf("📁 Files copied to UI directory")
	return nil
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

// ValidateEnvironment checks that required tools are available
func (c *Converter) ValidateEnvironment() error {
	// Check for Node.js
	if _, err := exec.LookPath("node"); err != nil {
		return fmt.Errorf("node not found in PATH")
	}

	// Check for LuaLaTeX
	if _, err := exec.LookPath("lualatex"); err != nil {
		return fmt.Errorf("lualatex not found in PATH")
	}

	log.Println("✅ Environment validation passed")
	return nil
}
