package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Simulação de mapeamento de modelos do OpenRouter
func resolveModel(modelName string) string {
	switch modelName {
	case "deepseek":
		return "deepseek/deepseek-chat"
	case "gemma":
		return "google/gemma-2-27b-it"
	case "qwen":
		return "qwen/qwen-2.5-coder-32b-instruct"
	default:
		return "anthropic/claude-3.5-sonnet"
	}
}

// Simulação da lógica de fallback de gravação de arquivos
func writeFallbackHTML(workspacePath string, prompt string) error {
	indexPath := filepath.Join(workspacePath, "index.html")
	content := "<!DOCTYPE html><html><body><h1>Editado via fallbacks local</h1><p>Prompt: " + prompt + "</p></body></html>"
	return os.WriteFile(indexPath, []byte(content), 0644)
}

// --- SUÍTE DE 5 TESTES AUTOMATIZADOS EM GO ---

// Teste 1: Validar mapeamento do modelo DeepSeek
func TestModelDeepSeekRouting(t *testing.T) {
	resolved := resolveModel("deepseek")
	expected := "deepseek/deepseek-chat"
	if resolved != expected {
		t.Errorf("Esperava %s, mas obteve %s", expected, resolved)
	}
}

// Teste 2: Validar mapeamento do modelo Gemma
func TestModelGemmaRouting(t *testing.T) {
	resolved := resolveModel("gemma")
	expected := "google/gemma-2-27b-it"
	if resolved != expected {
		t.Errorf("Esperava %s, mas obteve %s", expected, resolved)
	}
}

// Teste 3: Validar mapeamento do modelo Qwen
func TestModelQwenRouting(t *testing.T) {
	resolved := resolveModel("qwen")
	expected := "qwen/qwen-2.5-coder-32b-instruct"
	if resolved != expected {
		t.Errorf("Esperava %s, mas obteve %s", expected, resolved)
	}
}

// Teste 4: Validar gravação do arquivo de fallback local
func TestFallbackFileWrite(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "crom-workspace-*")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	err = writeFallbackHTML(tmpDir, "Mudar cor de fundo")
	if err != nil {
		t.Fatalf("Erro ao gravar arquivo de teste: %v", err)
	}

	data, err := os.ReadFile(filepath.Join(tmpDir, "index.html"))
	if err != nil {
		t.Fatal(err)
	}

	if !strings.Contains(string(data), "Mudar cor de fundo") {
		t.Errorf("Arquivo gerado não contém o prompt do teste")
	}
}

// Teste 5: Validar a resolução padrão do modelo caso não mapeado
func TestModelDefaultRoutingFallback(t *testing.T) {
	resolved := resolveModel("unknown-model")
	expected := "anthropic/claude-3.5-sonnet"
	if resolved != expected {
		t.Errorf("Esperava o fallback padrão %s, mas obteve %s", expected, resolved)
	}
}
