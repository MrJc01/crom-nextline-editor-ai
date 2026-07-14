package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

type CLIResponse struct {
	Status       string   `json:"status"`
	Message      string   `json:"message"`
	Steps        []string `json:"steps"`
	ChangedFiles []string `json:"changed_files,omitempty"`
}

// targetFile guarda o arquivo alvo da edição (default index.html), compartilhado
// com o motor de fallback para permitir edição de qualquer arquivo do projeto.
var targetFile = "index.html"

// Estojos de estrutura de dados para OpenRouter
type OpenRouterRequest struct {
	Model          string              `json:"model"`
	Messages       []OpenRouterMessage `json:"messages"`
	ResponseFormat *OpenRouterFormat   `json:"response_format,omitempty"`
}

type OpenRouterMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenRouterFormat struct {
	Type string `json:"type"`
}

type OpenRouterResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

type FileOperation struct {
	Action  string `json:"action"`
	Path    string `json:"path"`
	Content string `json:"content"`
}

type LLMOperations struct {
	Operations []FileOperation `json:"operations"`
}

func main() {
	action := flag.String("action", "modify", "Ação a executar (modify/reset)")
	prompt := flag.String("prompt", "", "Prompt para IA")
	workspace := flag.String("workspace", "", "Caminho do diretório do site preview")
	file := flag.String("file", "index.html", "Arquivo alvo da edição, relativo ao workspace")
	daemonAddr := flag.String("daemon", "localhost:17171", "Endereço do daemon Crom Agente")
	model := flag.String("model", "google/gemini-2.5-flash", "Modelo de IA do OpenRouter")
	flag.Parse()

	if *file != "" {
		targetFile = *file
	}

	if *workspace == "" {
		// Tentar inferir o caminho do workspace se não fornecido
		cwd, _ := os.Getwd()
		*workspace = filepath.Join(cwd, "../frontend/public/preview-site")
	}

	if *action == "reset" {
		resetWorkspace(*workspace)
		return
	}

	if *prompt == "" {
		printError("O prompt não pode ser vazio para a ação de modificação")
		return
	}

	// 1. Tentar conectar ao daemon do Crom Agente
	daemonOnline := checkDaemon(*daemonAddr)

	var message string
	var steps []string
	var changedFiles []string

	apiKey := os.Getenv("OPENROUTER_API_KEY")

	if daemonOnline {
		// Realizar a chamada de WebSocket real
		var err error
		message, steps, err = runDaemonTask(*daemonAddr, *prompt)
		if err != nil {
			// Em caso de erro, loga e usa o fallback
			steps = append(steps, fmt.Sprintf("Erro no Daemon: %s. Utilizando motor de fallback local.", err.Error()))
			if apiKey != "" {
				var errLLM error
				message, steps, changedFiles, errLLM = runLLMModification(*workspace, apiKey, *model, *prompt, steps)
				if errLLM != nil {
					steps = append(steps, fmt.Sprintf("Erro ao chamar LLM: %s. Fallback para simulador.", errLLM.Error()))
					message, steps = runFallbackEngine(*workspace, *prompt, steps)
					changedFiles = []string{targetFile}
				}
			} else {
				message, steps = runFallbackEngine(*workspace, *prompt, steps)
				changedFiles = []string{targetFile}
			}
		} else {
			steps = append([]string{"Conectado ao daemon Crom Agente", "Tarefa executada via WebSocket"}, steps...)
			// Atualiza o workspace (se o daemon não o fez diretamente)
			_ = updateWorkspaceFile(*workspace, *prompt)
			changedFiles = []string{targetFile}
		}
	} else {
		// Daemon offline: se houver API key, usa OpenRouter real, senão simulador
		steps = append(steps, "Daemon Crom Agente offline (porta 17171)")
		if apiKey != "" {
			var errLLM error
			message, steps, changedFiles, errLLM = runLLMModification(*workspace, apiKey, *model, *prompt, steps)
			if errLLM != nil {
				steps = append(steps, fmt.Sprintf("Erro ao chamar LLM: %s. Fallback para simulador.", errLLM.Error()))
				message, steps = runFallbackEngine(*workspace, *prompt, steps)
				changedFiles = []string{targetFile}
			}
		} else {
			message, steps = runFallbackEngine(*workspace, *prompt, steps)
			changedFiles = []string{targetFile}
		}
	}

	// Imprimir resultado JSON final para o Laravel ler
	resp := CLIResponse{
		Status:       "success",
		Message:      message,
		Steps:        steps,
		ChangedFiles: changedFiles,
	}

	respJSON, _ := json.MarshalIndent(resp, "", "  ")
	fmt.Println(string(respJSON))
}

func checkDaemon(addr string) bool {
	client := http.Client{
		Timeout: 1 * time.Second,
	}
	resp, err := client.Get(fmt.Sprintf("http://%s/v1/status", addr))
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func runDaemonTask(addr, prompt string) (string, []string, error) {
	u := fmt.Sprintf("ws://%s/", addr)
	c, _, err := websocket.DefaultDialer.Dial(u, nil)
	if err != nil {
		return "", nil, err
	}
	defer c.Close()

	// Enviar a inscrição e a tarefa
	taskMsg := map[string]interface{}{
		"type":    "task",
		"payload": prompt,
	}
	
	taskJSON, _ := json.Marshal(taskMsg)
	err = c.WriteMessage(websocket.TextMessage, taskJSON)
	if err != nil {
		return "", nil, err
	}

	var responseContent string
	steps := []string{"Conexão estabelecida", "Enviada tarefa de modificação"}

	// Ler mensagens do socket com timeout
	c.SetReadDeadline(time.Now().Add(5 * time.Second))
	for {
		_, message, err := c.ReadMessage()
		if err != nil {
			break
		}

		var msg map[string]interface{}
		if err := json.Unmarshal(message, &msg); err == nil {
			if msgType, ok := msg["type"].(string); ok {
				if msgType == "status" {
					statusVal, _ := msg["data"].(string)
					steps = append(steps, fmt.Sprintf("Status Agente: %s", statusVal))
					if statusVal == "finished" {
						break
					}
				} else if msgType == "message" {
					if content, ok := msg["content"].(string); ok {
						responseContent = content
					}
				}
			}
		}
	}

	if responseContent == "" {
		responseContent = "Modificação executada pelo agente local."
	}

	return responseContent, steps, nil
}

func runLLMModification(workspacePath, apiKey, model, prompt string, steps []string) (string, []string, []string, error) {
	steps = append(steps, "Escaneando arquivos do workspace")
	filesText, err := scanWorkspaceFiles(workspacePath)
	if err != nil {
		return "", steps, nil, err
	}

	steps = append(steps, fmt.Sprintf("Chamando API do OpenRouter com o modelo %s", model))
	
	systemPrompt := fmt.Sprintf("You are an AI assistant inside Crom Nextline Editor.\n" +
		"Your job is to modify files in the workspace directory to satisfy the user's prompt.\n" +
		"The files in the workspace are:\n%s\n\n" +
		"The user prompt is: \"%s\"\n\n" +
		"IMPORTANT GUIDELINES FOR TAILWIND CSS:\n" +
		"- If the workspace does NOT have a package.json file (meaning it is Go, PHP, Python, or a pure static HTML workspace without a Node.js build pipeline), you MUST NOT create tailwind.config.js, input.css, or output.css. Instead, import Tailwind CSS directly in the HTML <head> using the official Play CDN: <script src=\"https://cdn.tailwindcss.com\"></script>.\n" +
		"- If the workspace HAS a package.json file (Node.js/Vite/React project), you must follow its package manager and build configuration, writing local components and styles accordingly.\n\n" +
		"IMPORTANT GUIDELINES FOR TEMPLATES & HTML:\n" +
		"- Never hardcode large HTML page strings directly inside code files like `.go` or `.py` using string/byte print statements. Instead, write/update a template file in a templates folder (such as templates/index.html) and load it from the code file. This keeps the code clean and prevents compile errors.\n\n" +
		"You must output a JSON object with a single key \"operations\" which is an array of operations.\n" +
		"An operation must have:\n" +
		"- \"action\": \"write\" or \"delete\"\n" +
		"- \"path\": relative path of the file to write or delete\n" +
		"- \"content\": the complete new file content (required for \"write\")\n\n" +
		"Return ONLY the raw JSON object. Do not include markdown code block formatting (no triple backticks json).", filesText, prompt)

	reqBody := OpenRouterRequest{
		Model: model,
		Messages: []OpenRouterMessage{
			{Role: "user", Content: systemPrompt},
		},
		ResponseFormat: &OpenRouterFormat{Type: "json_object"},
	}

	reqJSON, err := json.Marshal(reqBody)
	if err != nil {
		return "", steps, nil, err
	}

	req, err := http.NewRequest("POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(reqJSON))
	if err != nil {
		return "", steps, nil, err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("HTTP-Referer", "https://crom.run")
	req.Header.Set("X-Title", "Crom Nextline Editor")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", steps, nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", steps, nil, fmt.Errorf("API OpenRouter retornou status %d: %s", resp.StatusCode, string(body))
	}

	var orResp OpenRouterResponse
	if err := json.NewDecoder(resp.Body).Decode(&orResp); err != nil {
		return "", steps, nil, err
	}

	if len(orResp.Choices) == 0 {
		return "", steps, nil, fmt.Errorf("OpenRouter retornou resposta vazia")
	}

	rawJSON := orResp.Choices[0].Message.Content
	// Strip markdown blocks if present
	rawJSON = strings.TrimPrefix(rawJSON, "```json")
	rawJSON = strings.TrimPrefix(rawJSON, "```")
	rawJSON = strings.TrimSuffix(rawJSON, "```")
	rawJSON = strings.TrimSpace(rawJSON)

	var ops LLMOperations
	if err := json.Unmarshal([]byte(rawJSON), &ops); err != nil {
		return "", steps, nil, fmt.Errorf("falha ao decodificar JSON do LLM: %s. Resposta original: %s", err.Error(), rawJSON)
	}

	steps = append(steps, fmt.Sprintf("Recebido plano de modificação com %d operações", len(ops.Operations)))
	
	changedFiles, err := applyOperations(workspacePath, ops.Operations)
	if err != nil {
		return "", steps, nil, err
	}

	steps = append(steps, fmt.Sprintf("Sucesso ao aplicar %d operações de edição", len(changedFiles)))
	
	var msg string
	if len(changedFiles) > 0 {
		msg = "A IA concluiu com sucesso as modificações solicitadas. Arquivos alterados no workspace:\n"
		for _, f := range changedFiles {
			msg += fmt.Sprintf("- `%s`\n", f)
		}
	} else {
		msg = "A IA processou o pedido, mas nenhuma operação de alteração de arquivo foi necessária."
	}
	
	return msg, steps, changedFiles, nil
}

func scanWorkspaceFiles(root string) (string, error) {
	var sb strings.Builder
	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			name := info.Name()
			if name == ".git" || name == "node_modules" || name == "vendor" {
				return filepath.SkipDir
			}
			return nil
		}

		rel, err := filepath.Rel(root, path)
		if err != nil {
			return nil
		}

		ext := strings.ToLower(filepath.Ext(path))
		isText := false
		textExts := []string{".html", ".css", ".js", ".json", ".ts", ".tsx", ".php", ".py", ".go", ".md", ".txt"}
		for _, e := range textExts {
			if ext == e {
				isText = true
				break
			}
		}

		if isText {
			content, err := os.ReadFile(path)
			if err == nil {
				sb.WriteString(fmt.Sprintf("--- File: %s ---\n", rel))
				sb.WriteString(string(content))
				sb.WriteString("\n\n")
			}
		}
		return nil
	})
	return sb.String(), err
}

func applyOperations(root string, ops []FileOperation) ([]string, error) {
	var changed []string
	for _, op := range ops {
		cleanPath := filepath.Clean(op.Path)
		if strings.HasPrefix(cleanPath, "..") || filepath.IsAbs(cleanPath) {
			return nil, fmt.Errorf("caminho de arquivo inválido/inseguro: %s", op.Path)
		}

		target := filepath.Join(root, cleanPath)

		if op.Action == "write" {
			dir := filepath.Dir(target)
			if err := os.MkdirAll(dir, 0755); err != nil {
				return nil, err
			}
			if err := os.WriteFile(target, []byte(op.Content), 0644); err != nil {
				return nil, err
			}
			changed = append(changed, cleanPath)
		} else if op.Action == "delete" {
			if err := os.Remove(target); err == nil {
				changed = append(changed, cleanPath)
			}
		}
	}
	return changed, nil
}

func runFallbackEngine(workspacePath, prompt string, steps []string) (string, []string) {
	steps = append(steps, "Iniciando motor de modificação local")
	err := updateWorkspaceFile(workspacePath, prompt)
	if err != nil {
		steps = append(steps, fmt.Sprintf("Erro ao atualizar arquivo: %s", err.Error()))
		return "Erro ao modificar o arquivo no disco.", steps
	}

	steps = append(steps, "index.html atualizado no disco", "Modificações concluídas com sucesso")
	
	msg := fmt.Sprintf("Apliquei as modificações solicitadas para '%s' no arquivo index.html do workspace.", prompt)
	return msg, steps
}

func updateWorkspaceFile(workspacePath, prompt string) error {
	indexPath := filepath.Join(workspacePath, targetFile)
	if _, err := os.Stat(indexPath); os.IsNotExist(err) {
		// Se index.html não existir na raiz, tenta procurar em templates/index.html
		templatesPath := filepath.Join(workspacePath, "templates", "index.html")
		if _, errTmpl := os.Stat(templatesPath); errTmpl == nil {
			indexPath = templatesPath
		}
	}

	// Ler o arquivo atual
	data, err := os.ReadFile(indexPath)
	if err != nil {
		return err
	}

	htmlContent := string(data)
	lowerPrompt := strings.ToLower(prompt)

	if strings.Contains(lowerPrompt, "contato") || strings.Contains(lowerPrompt, "contact") {
		// Adicionar formulário de contato se não existir
		if !strings.Contains(htmlContent, "<!-- Contact Section -->") {
			contactHTML := `<!-- Contact Section -->
  <section class="max-w-4xl mx-auto px-6 py-16 border-t border-slate-800 bg-slate-950/40 rounded-2xl mb-16 shadow-xl">
    <div class="text-center max-w-md mx-auto mb-10">
      <h2 class="text-2xl font-bold text-white">Entre em Contato</h2>
      <p class="text-slate-400 text-sm mt-2">Envie uma mensagem e retornaremos em breve.</p>
    </div>
    <form class="space-y-4 max-w-md mx-auto">
      <div>
        <label class="block text-slate-300 text-xs font-semibold mb-1">Nome completo</label>
        <input type="text" placeholder="Seu nome" class="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded px-3 py-2 text-sm text-white outline-none transition-colors" />
      </div>
      <div>
        <label class="block text-slate-300 text-xs font-semibold mb-1">E-mail</label>
        <input type="email" placeholder="seu@email.com" class="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded px-3 py-2 text-sm text-white outline-none transition-colors" />
      </div>
      <div>
        <label class="block text-slate-300 text-xs font-semibold mb-1">Mensagem</label>
        <textarea rows="3" placeholder="Escreva sua mensagem..." class="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded px-3 py-2 text-sm text-white outline-none transition-colors"></textarea>
      </div>
      <button type="button" onclick="alert('Mensagem enviada!')" class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded text-sm transition-all shadow-lg shadow-indigo-600/20">Enviar Mensagem</button>
    </form>
  </section>

  <!-- Footer -->`
			htmlContent = strings.Replace(htmlContent, "<!-- Footer -->", contactHTML, 1)
		}
	} else if strings.Contains(lowerPrompt, "escuro") || strings.Contains(lowerPrompt, "dark") || strings.Contains(lowerPrompt, "preto") {
		htmlContent = strings.ReplaceAll(htmlContent, "background-color: #0f172a;", "background-color: #030712;")
		htmlContent = strings.ReplaceAll(htmlContent, "bg-slate-950/80", "bg-black/90")
		htmlContent = strings.ReplaceAll(htmlContent, "background: #f8fafc;", "background: #0f172a;")
		htmlContent = strings.ReplaceAll(htmlContent, "color: #0f172a;", "color: white;")
	} else if strings.Contains(lowerPrompt, "claro") || strings.Contains(lowerPrompt, "light") {
		htmlContent = strings.ReplaceAll(htmlContent, "background-color: #0f172a;", "background-color: #f8fafc;")
		htmlContent = strings.ReplaceAll(htmlContent, "color: #f8fafc;", "color: #0f172a;")
		htmlContent = strings.ReplaceAll(htmlContent, "text-white", "text-slate-900")
		htmlContent = strings.ReplaceAll(htmlContent, "text-slate-400", "text-slate-600")
		htmlContent = strings.ReplaceAll(htmlContent, "bg-slate-900/50", "bg-white/70")
		htmlContent = strings.ReplaceAll(htmlContent, "border-slate-800", "border-slate-200")
		htmlContent = strings.ReplaceAll(htmlContent, "background: #0f172a;", "background: #f8fafc;")
		htmlContent = strings.ReplaceAll(htmlContent, "color: white;", "color: #0f172a;")
	} else if strings.Contains(lowerPrompt, "depoimento") || strings.Contains(lowerPrompt, "testimonial") {
		if !strings.Contains(htmlContent, "<!-- Testimonials -->") {
			testimonialsHTML := `<!-- Testimonials -->
  <section class="max-w-6xl mx-auto px-6 py-16 border-t border-slate-800/60">
    <div class="text-center mb-12">
      <h2 class="text-3xl font-bold text-white">O que dizem sobre nós</h2>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-slate-900/40 border border-slate-800 p-6 rounded-xl">
        <p class="text-slate-300 italic text-sm">"O Crom Nextline mudou totalmente a velocidade de deploy da nossa equipe. Simplesmente incrível."</p>
        <h4 class="mt-4 font-bold text-white text-xs">Carlos M. &mdash; CTO, TechHub</h4>
      </div>
      <div class="bg-slate-900/40 border border-slate-800 p-6 rounded-xl">
        <p class="text-slate-300 italic text-sm">"A edição visual direto via chat é super intuitiva. A integração com Go local é ultra rápida!"</p>
        <h4 class="mt-4 font-bold text-white text-xs">Julia S. &mdash; Designer, DevArt</h4>
      </div>
      <div class="bg-slate-900/40 border border-slate-800 p-6 rounded-xl">
        <p class="text-slate-300 italic text-sm">"Rodar em contêineres Docker de forma isolada nos garante segurança e praticidade absoluta."</p>
        <h4 class="mt-4 font-bold text-white text-xs">Felipe D. &mdash; DevOps, CloudGen</h4>
      </div>
    </div>
  </section>

  <!-- Footer -->`
			htmlContent = strings.Replace(htmlContent, "<!-- Footer -->", testimonialsHTML, 1)
		}
	} else if strings.Contains(lowerPrompt, "hero") || strings.Contains(lowerPrompt, "título") || strings.Contains(lowerPrompt, "titulo") {
		htmlContent = strings.Replace(htmlContent, "Crie Sites com IA Local", "Sua Imaginação é o Limite com Crom AI", 1)
	}

	return os.WriteFile(indexPath, []byte(htmlContent), 0644)
}

func resetWorkspace(workspacePath string) {
	indexPath := filepath.Join(workspacePath, "index.html")
	defaultHTML := `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #0f172a; color: #f8fafc; font-family: system-ui, sans-serif; }
  </style>
</head>
<body class="flex flex-col min-h-screen">
  <!-- Header -->
  <header class="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex justify-between items-center sticky top-0 z-50">
    <div class="flex items-center gap-3">
      <div class="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">C</div>
      <span class="font-bold tracking-tight text-white text-lg">Crom Editor</span>
    </div>
    <nav class="flex items-center gap-6">
      <a href="#" class="text-slate-400 hover:text-white text-sm transition-colors">Início</a>
      <a href="#" class="text-slate-400 hover:text-white text-sm transition-colors">Recursos</a>
      <a href="#" class="text-slate-400 hover:text-white text-sm transition-colors">Preços</a>
      <button class="px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-md shadow-indigo-600/10">Começar</button>
    </nav>
  </header>

  <!-- Hero Section -->
  <main class="flex-grow flex items-center justify-center px-6 py-20 relative overflow-hidden">
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-slate-950 to-slate-950 -z-10"></div>
    <div class="text-center max-w-2xl mx-auto">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
        <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
        Pronto para Customização por IA
      </div>
      <h1 class="text-4xl md:text-6xl font-extrabold tracking-tight text-white bg-gradient-to-r from-indigo-200 via-purple-300 to-pink-300 bg-clip-text text-transparent leading-none py-2">
        Crie Sites com IA Local
      </h1>
      <p class="mt-6 text-slate-400 text-base md:text-lg leading-relaxed">
        Este é um site estático inicial sendo servido no canvas. Use o chat de controle para pedir alterações de design e funcionalidade instantâneas executadas pelo nosso agente.
      </p>
      <div class="mt-10 flex flex-wrap justify-center gap-4">
        <button class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2">
          Começar Agora <span class="text-indigo-200">&rarr;</span>
        </button>
        <button class="px-6 py-3 bg-slate-800 hover:bg-slate-700 font-semibold rounded-lg border border-slate-700 transition-all">
          Saber mais
        </button>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="border-t border-slate-800/80 bg-slate-950/80 py-8 px-6 text-center text-slate-500 text-xs">
    &copy; 2026 Crom Nextline Editor. Todos os direitos reservados.
  </footer>
</body>
</html>`
	_ = os.WriteFile(indexPath, []byte(defaultHTML), 0644)
	fmt.Println(`{"status":"success","message":"Workspace resetado para a versão padrão","steps":["Arquivo index.html resetado"]}`)
}

func printError(msg string) {
	resp := CLIResponse{
		Status:  "error",
		Message: msg,
		Steps:   []string{"Execução encerrada com erro"},
	}
	respJSON, _ := json.Marshal(resp)
	fmt.Println(string(respJSON))
}
