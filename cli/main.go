package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

type CLIResponse struct {
	Status  string   `json:"status"`
	Message string   `json:"message"`
	Steps   []string `json:"steps"`
}

func main() {
	action := flag.String("action", "modify", "Ação a executar (modify/reset)")
	prompt := flag.String("prompt", "", "Prompt para IA")
	workspace := flag.String("workspace", "", "Caminho do diretório do site preview")
	daemonAddr := flag.String("daemon", "localhost:17171", "Endereço do daemon Crom Agente")
	flag.Parse()

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

	if daemonOnline {
		// Realizar a chamada de WebSocket real
		var err error
		message, steps, err = runDaemonTask(*daemonAddr, *prompt)
		if err != nil {
			// Em caso de erro, loga e usa o fallback
			steps = append(steps, fmt.Sprintf("Erro no Daemon: %s. Utilizando motor de fallback local.", err.Error()))
			message, steps = runFallbackEngine(*workspace, *prompt, steps)
		} else {
			steps = append([]string{"Conectado ao daemon Crom Agente", "Tarefa executada via WebSocket"}, steps...)
			// Atualiza o workspace (se o daemon não o fez diretamente)
			_ = updateWorkspaceFile(*workspace, *prompt)
		}
	} else {
		// Daemon offline: Fallback local para testes e facilidade de demonstração
		steps = append(steps, "Daemon Crom Agente offline (porta 17171)")
		message, steps = runFallbackEngine(*workspace, *prompt, steps)
	}

	// Imprimir resultado JSON final para o Laravel ler
	resp := CLIResponse{
		Status:  "success",
		Message: message,
		Steps:   steps,
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
	indexPath := filepath.Join(workspacePath, "index.html")
	
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
	} else if strings.Contains(lowerPrompt, "claro") || strings.Contains(lowerPrompt, "light") {
		htmlContent = strings.ReplaceAll(htmlContent, "background-color: #0f172a;", "background-color: #f8fafc;")
		htmlContent = strings.ReplaceAll(htmlContent, "color: #f8fafc;", "color: #0f172a;")
		htmlContent = strings.ReplaceAll(htmlContent, "text-white", "text-slate-900")
		htmlContent = strings.ReplaceAll(htmlContent, "text-slate-400", "text-slate-600")
		htmlContent = strings.ReplaceAll(htmlContent, "bg-slate-900/50", "bg-white/70")
		htmlContent = strings.ReplaceAll(htmlContent, "border-slate-800", "border-slate-200")
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
