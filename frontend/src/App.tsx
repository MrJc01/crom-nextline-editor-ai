import { useState, useEffect, useRef } from 'react'
import { 
  MessageSquare, 
  Send, 
  Terminal, 
  RefreshCw, 
  Laptop, 
  Smartphone, 
  Tablet, 
  FolderTree, 
  CheckCircle2, 
  Database, 
  Cpu, 
  Sparkles, 
  FileCode, 
  HardDrive
} from 'lucide-react'

interface Message {
  id: string
  sender: 'user' | 'ai'
  text: string
  timestamp: string
  steps?: string[]
}

interface TerminalLog {
  timestamp: string
  source: 'laravel' | 'go' | 'crom-agent'
  type: 'info' | 'success' | 'warning'
  message: string
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Olá! Sou o assistente Crom. Como posso ajudar a modificar ou criar o seu site hoje? Peça para adicionar seções, alterar o tema, ou criar componentes novos.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'logs'>('preview')
  const [agentStatus, setAgentStatus] = useState<'idle' | 'analyzing' | 'running_go' | 'writing_files' | 'done'>('idle')
  const [selectedFile, setSelectedFile] = useState('index.html')
  
  // Terminal logs state
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([
    { timestamp: '20:00:01', source: 'laravel', type: 'info', message: 'Servidor Laravel iniciado na porta 8000' },
    { timestamp: '20:00:02', source: 'crom-agent', type: 'success', message: 'Crom-Agente SDK conectado com sucesso ao endpoint local' },
  ])

  // Mock code base
  const [files, setFiles] = useState<{ [key: string]: string }>({
    'index.html': `<!DOCTYPE html>
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
</html>`,
    'index.css': `@import "tailwindcss";`,
    'agent-config.json': `{
  "agent": "crom-agente",
  "version": "1.0.0",
  "local_binary": "./cli/crom-cli",
  "backend_framework": "Laravel 11",
  "sdk": "crom-agente-sdk-go"
}`
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollTerminal = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    scrollTerminal()
  }, [terminalLogs])

  const addLog = (source: 'laravel' | 'go' | 'crom-agent', type: 'info' | 'success' | 'warning', message: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setTerminalLogs(prev => [...prev, { timestamp: time, source, type, message }])
  }

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return

    // 1. Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsProcessing(true)
    setAgentStatus('analyzing')

    // 2. Add initial logs
    addLog('laravel', 'info', `Requisição recebida: "${text}"`)
    addLog('laravel', 'info', 'Preparando chamada para o binário Go CLI...')
    
    await new Promise(resolve => setTimeout(resolve, 800))
    setAgentStatus('running_go')
    addLog('go', 'info', './cli/crom-cli --action="modify" --prompt="' + text + '"')
    addLog('go', 'info', 'Conectando ao SDK crom-agente-sdk...')
    addLog('crom-agent', 'info', 'Analisando arquivos do site e plano de edição...')

    await new Promise(resolve => setTimeout(resolve, 1000))
    setAgentStatus('writing_files')
    addLog('crom-agent', 'success', 'Modificações geradas com sucesso!')
    addLog('go', 'success', 'Atualizando arquivo index.html no disco...')

    // 3. Process changes on HTML based on queries
    const lowerText = text.toLowerCase()
    let updatedHTML = files['index.html']
    let aiResponse = 'Fiz os ajustes solicitados no design!'

    if (lowerText.includes('contato') || lowerText.includes('contact')) {
      updatedHTML = updatedHTML.replace(
        '<!-- Footer -->',
        `<!-- Contact Section -->
  <section class="max-w-4xl mx-auto px-6 py-16 border-t border-slate-800 bg-slate-950/40 rounded-2xl mb-16 shadow-xl">
    <div class="text-center max-w-md mx-auto mb-10">
      <h2 class="text-2xl font-bold text-white">Entre em Contato</h2>
      <p class="text-slate-400 text-sm mt-2">Envie uma mensagem e retornaremos em breve.</p>
    </div>
    <form class="space-y-4 max-w-md mx-auto" onsubmit="event.preventDefault(); alert('Mensagem enviada (Simulação)!');">
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
        <textarea rows={3} placeholder="Escreva sua mensagem..." class="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded px-3 py-2 text-sm text-white outline-none transition-colors"></textarea>
      </div>
      <button type="submit" class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded text-sm transition-all shadow-lg shadow-indigo-600/20">Enviar Mensagem</button>
    </form>
  </section>

  <!-- Footer -->`
      )
      aiResponse = 'Adicionei um formulário de contato moderno na parte inferior do site, estilizado com Tailwind CSS e responsivo.'
    } else if (lowerText.includes('escuro') || lowerText.includes('dark') || lowerText.includes('preto') || lowerText.includes('black')) {
      updatedHTML = updatedHTML.replace('background-color: #0f172a;', 'background-color: #030712;')
      updatedHTML = updatedHTML.replace('bg-slate-950/80', 'bg-black/90')
      aiResponse = 'Mudei o tema de fundo para um tom cinza escuro/preto profundo (#030712) para um look ainda mais minimalista.'
    } else if (lowerText.includes('claro') || lowerText.includes('light') || lowerText.includes('branco')) {
      updatedHTML = updatedHTML
        .replace('background-color: #0f172a;', 'background-color: #f8fafc;')
        .replace('color: #f8fafc;', 'color: #0f172a;')
        .replace('text-white', 'text-slate-900')
        .replace('text-slate-400', 'text-slate-600')
        .replace('bg-slate-900/50', 'bg-white/70')
        .replace('border-slate-800', 'border-slate-200')
      aiResponse = 'Ajustei as classes de cores e as definições para criar um tema claro com fundo suave e excelente contraste.'
    } else if (lowerText.includes('depoimento') || lowerText.includes('testimonial') || lowerText.includes('clientes')) {
      updatedHTML = updatedHTML.replace(
        '<!-- Footer -->',
        `<!-- Testimonials -->
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
      )
      aiResponse = 'Adicionei uma seção de depoimentos de clientes com três cards em grid responsivo usando Tailwind CSS.'
    } else if (lowerText.includes('hero') || lowerText.includes('título') || lowerText.includes('titulo')) {
      updatedHTML = updatedHTML.replace(
        'Crie Sites com IA Local',
        'Sua Imaginação é o Limite com Crom AI'
      )
      aiResponse = 'Alterei o título principal do Hero Section para destacar a imaginação e a potência do ecossistema Crom.'
    } else {
      aiResponse = `Recebi seu pedido: "${text}". Executei as modificações no código da página. O iframe de pré-visualização já foi recarregado com a nova versão.`
    }

    setFiles(prev => ({
      ...prev,
      'index.html': updatedHTML
    }))

    addLog('laravel', 'success', 'Hot reload enviado via WebSocket para o frontend.')
    addLog('laravel', 'info', 'Status: Pronto.')

    await new Promise(resolve => setTimeout(resolve, 600))
    
    // 4. Add AI response message
    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      text: aiResponse,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      steps: [
        'Recebido pelo backend Laravel',
        'Binário Go executou crom-agente-sdk',
        'Modificações injetadas no index.html',
        'Hot-reload aplicado no Iframe'
      ]
    }

    setMessages(prev => [...prev, aiMsg])
    setIsProcessing(false)
    setAgentStatus('done')
    
    // Clear agent status back to idle after a few seconds
    setTimeout(() => {
      setAgentStatus('idle')
    }, 2000)
  }

  // Pre-configured helper suggestions
  const suggestions = [
    'Adicionar formulário de contato',
    'Mudar o fundo para tema escuro profundo',
    'Adicionar seção de depoimentos dos clientes',
    'Alterar o título da Hero para algo impactante',
  ]

  // Construct srcDoc for iframe
  const iframeSrcDoc = files['index.html']

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Top Navbar */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-3.5 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
            C
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              Crom Nextline Editor <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono">v1.0.0-Beta</span>
            </h1>
            <p className="text-[10px] text-slate-400">Ambiente de IA Autônoma Local</p>
          </div>
        </div>

        {/* Mid Stats/Status Indicator */}
        <div className="hidden md:flex items-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-850">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Docker: <strong className="text-slate-200">Ativo</strong></span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-850">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Backend: <strong className="text-slate-200">Laravel 11</strong></span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-850">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>CLI Wrapper: <strong className="text-slate-200">Go (crom-cli)</strong></span>
          </div>
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleSendMessage("Refazer o site completamente")}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Resetar Site
          </button>
          
          <div className="h-6 w-px bg-slate-800"></div>

          <div className="text-xs flex items-center gap-2 font-mono">
            {agentStatus === 'idle' && (
              <span className="text-slate-400 flex items-center gap-1.5 bg-slate-800/40 px-2.5 py-1 rounded border border-slate-850">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> IDLE
              </span>
            )}
            {agentStatus === 'analyzing' && (
              <span className="text-yellow-400 flex items-center gap-1.5 bg-yellow-500/10 px-2.5 py-1 rounded border border-yellow-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span> ANALISANDO
              </span>
            )}
            {agentStatus === 'running_go' && (
              <span className="text-cyan-400 flex items-center gap-1.5 bg-cyan-500/10 px-2.5 py-1 rounded border border-cyan-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span> EXECUTANDO GO CLI
              </span>
            )}
            {agentStatus === 'writing_files' && (
              <span className="text-purple-400 flex items-center gap-1.5 bg-purple-500/10 px-2.5 py-1 rounded border border-purple-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span> SALVANDO CÓDIGO
              </span>
            )}
            {agentStatus === 'done' && (
              <span className="text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> SYNCED
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-grow w-full overflow-hidden">
        
        {/* Left Side: Chat Control and Logs */}
        <div className="w-[450px] md:w-[480px] shrink-0 border-r border-slate-800 flex flex-col bg-slate-900/40 relative">
          
          {/* Tabs header */}
          <div className="flex border-b border-slate-800 bg-slate-950/20 text-xs shrink-0">
            <button 
              onClick={() => setActiveTab('preview')}
              className={`flex-1 py-3 px-4 font-semibold text-center transition-all flex items-center justify-center gap-1.5 border-b-2 ${
                activeTab === 'preview' ? 'border-indigo-500 text-white bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat de Comando
            </button>
            <button 
              onClick={() => setActiveTab('code')}
              className={`flex-1 py-3 px-4 font-semibold text-center transition-all flex items-center justify-center gap-1.5 border-b-2 ${
                activeTab === 'code' ? 'border-indigo-500 text-white bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Ver Código Fonte
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={`flex-1 py-3 px-4 font-semibold text-center transition-all flex items-center justify-center gap-1.5 border-b-2 ${
                activeTab === 'logs' ? 'border-indigo-500 text-white bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Logs CLI ({terminalLogs.length})
            </button>
          </div>

          {/* TAB CONTENT: CHAT CONTROL */}
          {activeTab === 'preview' && (
            <>
              {/* Messages Body */}
              <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col max-w-[85%] ${
                      msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <div 
                      className={`rounded-xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                        msg.sender === 'user' 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-bl-none'
                      }`}
                    >
                      {msg.text}

                      {/* Display agent steps if present */}
                      {msg.steps && (
                        <div className="mt-3 pt-2.5 border-t border-slate-700/60 text-xs text-slate-400 space-y-1.5">
                          <div className="font-semibold text-slate-300 flex items-center gap-1 mb-1">
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            Ações concluídas pelo agente:
                          </div>
                          {msg.steps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-slate-300">
                              <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
                              {step}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                ))}
                
                {isProcessing && (
                  <div className="flex flex-col max-w-[80%] mr-auto items-start">
                    <div className="rounded-xl px-4 py-3 bg-slate-800/60 border border-slate-700/50 text-slate-400 text-sm rounded-bl-none flex items-center gap-2">
                      <span className="flex gap-1 items-center">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"></span>
                      </span>
                      <span>Orquestrando Crom Agente...</span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions Panel */}
              <div className="px-4 py-2 bg-slate-900/30 border-t border-slate-850 shrink-0">
                <span className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider">Sugestões rápidas</span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(s)}
                      disabled={isProcessing}
                      className="text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/60 rounded-md py-1 px-2.5 transition-colors cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage(inputText)
                  }}
                  className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus-within:border-indigo-500/80 transition-all shadow-inner"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={isProcessing}
                    placeholder="Pedir alteração (ex: 'Adicionar seção de contato')..."
                    className="flex-grow bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isProcessing}
                    className="h-8 w-8 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 px-1">
                  <span>Modificações enviadas ao Laravel local</span>
                  <span>vias de CLI Go</span>
                </div>
              </div>
            </>
          )}

          {/* TAB CONTENT: CODE EXPLORER */}
          {activeTab === 'code' && (
            <div className="flex-grow flex flex-col overflow-hidden">
              
              {/* File tree */}
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-950/40 border-b border-slate-850 text-xs text-slate-400 shrink-0">
                <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
                <span>Explorador de Arquivos Modificados</span>
              </div>

              {/* File list tabs */}
              <div className="flex bg-slate-950/20 border-b border-slate-850 px-2 py-1 text-xs shrink-0">
                {Object.keys(files).map((filename) => (
                  <button
                    key={filename}
                    onClick={() => setSelectedFile(filename)}
                    className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                      selectedFile === filename ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileCode className="w-3 h-3 text-slate-400" />
                    {filename}
                  </button>
                ))}
              </div>

              {/* Code Viewer editor window */}
              <div className="flex-grow overflow-auto p-4 bg-slate-950/90 font-mono text-xs text-slate-300 leading-relaxed relative">
                <div className="absolute top-2 right-2 text-[10px] text-indigo-400/60 bg-indigo-500/5 px-2 py-0.5 border border-indigo-500/10 rounded">
                  Somente Leitura (Editado por IA)
                </div>
                <pre className="whitespace-pre">{files[selectedFile]}</pre>
              </div>

              {/* Code Info Footer */}
              <div className="p-3 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-slate-500" />
                  Caminho do arquivo no disco
                </span>
                <span className="font-mono text-slate-300">
                  /home/j/Documentos/GitHub/crom-nextline-editor-ai/frontend/{selectedFile}
                </span>
              </div>
            </div>
          )}

          {/* TAB CONTENT: TERMINAL LOGS */}
          {activeTab === 'logs' && (
            <div className="flex-grow flex flex-col overflow-hidden bg-slate-950">
              
              {/* Terminal Title */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-850 text-xs shrink-0">
                <span className="font-mono text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" /> Console de logs do Laravel & Go Wrapper
                </span>
                <button 
                  onClick={() => setTerminalLogs([])}
                  className="text-[10px] text-slate-500 hover:text-slate-300 underline font-mono"
                >
                  Limpar
                </button>
              </div>

              {/* Terminal Logs List */}
              <div className="flex-grow p-4 overflow-y-auto font-mono text-[11px] space-y-2 select-text">
                {terminalLogs.length === 0 ? (
                  <p className="text-slate-600 italic">Nenhum log registrado ainda.</p>
                ) : (
                  terminalLogs.map((log, idx) => (
                    <div key={idx} className="flex gap-2 items-start hover:bg-slate-900/50 p-0.5 rounded">
                      <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                      
                      {/* Log Badge */}
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 uppercase ${
                        log.source === 'laravel' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        log.source === 'go' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                        'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {log.source}
                      </span>

                      {/* Log Message */}
                      <span className={`flex-grow ${
                        log.type === 'success' ? 'text-emerald-400' :
                        log.type === 'warning' ? 'text-yellow-400' :
                        'text-slate-300'
                      }`}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Site Preview / Visual Canvas */}
        <div className="flex-grow flex flex-col bg-slate-950 overflow-hidden relative">
          
          {/* Iframe Control Bar */}
          <div className="flex items-center justify-between px-6 py-2 bg-slate-900/50 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/70"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/70"></span>
              <span className="w-3 h-3 rounded-full bg-green-500/70"></span>
              <div className="ml-4 h-6 px-3 rounded bg-slate-950/60 border border-slate-850 text-[10px] text-slate-400 font-mono flex items-center gap-1.5 w-64 md:w-80 select-all">
                <span className="text-emerald-500">http://localhost:8000</span>
                <span className="text-slate-600">/preview</span>
              </div>
            </div>

            {/* Screen Toggles */}
            <div className="flex items-center gap-1.5 bg-slate-950/50 p-1 rounded-md border border-slate-800">
              <button 
                onClick={() => setPreviewMode('desktop')}
                title="Visualização Desktop"
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  previewMode === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setPreviewMode('tablet')}
                title="Visualização Tablet"
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  previewMode === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setPreviewMode('mobile')}
                title="Visualização Mobile"
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  previewMode === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Iframe Viewport Container */}
          <div className="flex-grow flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
            
            {/* Grid Pattern Background for design studio feeling */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25"></div>

            {/* Simulated Device frame */}
            <div 
              className={`bg-slate-950 border border-slate-800 shadow-2xl rounded-xl overflow-hidden transition-all duration-300 flex flex-col h-full z-10 ${
                previewMode === 'desktop' ? 'w-full' :
                previewMode === 'tablet' ? 'w-[768px]' :
                'w-[375px] max-w-full'
              }`}
            >
              <iframe
                title="Live Website Preview"
                srcDoc={iframeSrcDoc}
                className="w-full h-full border-none bg-slate-900"
                sandbox="allow-scripts allow-forms"
              />
            </div>

          </div>

        </div>

      </div>

    </div>
  )
}
