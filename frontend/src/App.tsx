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
  HardDrive,
  Plus,
  Play,
  Square,
  Lock,
  ExternalLink,
  FolderOpen
} from 'lucide-react'

interface Workspace {
  id: string
  name: string
  port: number
  status: 'running' | 'stopped'
  path: string
  created_at: string
}

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

const API_BASE = 'http://localhost:8000/api'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginEmail, setLoginEmail] = useState('admin@crom.run')
  const [loginPassword, setLoginPassword] = useState('password')
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Olá! Sou o assistente Crom. Por favor, crie ou selecione um Workspace na aba lateral para começarmos a editar seu site!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'logs'>('preview')
  const [agentStatus, setAgentStatus] = useState<'idle' | 'analyzing' | 'running_go' | 'writing_files' | 'done'>('idle')
  const [files, setFiles] = useState<{ [key: string]: string }>({ 'index.html': 'Selecione um workspace para visualizar o código.' })
  const [selectedFile, setSelectedFile] = useState('index.html')
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')

  // Terminal logs state
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([
    { timestamp: '20:00:01', source: 'laravel', type: 'info', message: 'Servidor Laravel iniciado na porta 8000' },
    { timestamp: '20:00:02', source: 'crom-agent', type: 'success', message: 'Crom-Agente pronto e aguardando conexões' },
  ])

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

  // Fetch workspaces
  const fetchWorkspaces = async () => {
    try {
      const response = await fetch(`${API_BASE}/workspaces`)
      const data = await response.json()
      if (data.status === 'success') {
        setWorkspaces(data.workspaces)
      }
    } catch (err) {
      addLog('laravel', 'warning', 'Erro ao conectar ao Laravel Backend. Certifique-se de que a API esteja ativa na porta 8000.')
    }
  }

  // Load workspaces when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkspaces()
    }
  }, [isAuthenticated])

  // Sync workspace files
  const syncWorkspaceFiles = async (workspaceId: string) => {
    try {
      const response = await fetch(`${API_BASE}/files?workspace_id=${workspaceId}`)
      const data = await response.json()
      if (data.status === 'success') {
        setFiles(data.files)
        if (data.files['index.html']) {
          setSelectedFile('index.html')
        }
      }
    } catch (err) {
      addLog('laravel', 'warning', 'Erro ao buscar arquivos do workspace.')
    }
  }

  // Select active workspace
  const handleSelectWorkspace = (ws: Workspace) => {
    setActiveWorkspace(ws)
    syncWorkspaceFiles(ws.id)
    setMessages([
      {
        id: '1',
        sender: 'ai',
        text: `Workspace "${ws.name}" selecionado com sucesso! Como gostaria de alterar este site?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ])
    addLog('laravel', 'info', `Workspace ativo alterado para: ${ws.name} (${ws.id})`)
  }

  const addLog = (source: 'laravel' | 'go' | 'crom-agent', type: 'info' | 'success' | 'warning', message: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setTerminalLogs(prev => [...prev, { timestamp: time, source, type, message }])
  }

  // Handle Create Workspace
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWorkspaceName.trim()) return

    try {
      const response = await fetch(`${API_BASE}/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkspaceName })
      })
      const data = await response.json()
      if (data.status === 'success') {
        setNewWorkspaceName('')
        setIsCreateModalOpen(false)
        addLog('laravel', 'success', `Novo workspace criado: ${data.workspace.name}`)
        await fetchWorkspaces()
        handleSelectWorkspace(data.workspace)
      }
    } catch (err) {
      addLog('laravel', 'warning', 'Falha ao criar workspace no backend.')
    }
  }

  // Start Workspace Nginx Container
  const handleStartDocker = async (wsId: string) => {
    addLog('laravel', 'info', 'Iniciando contêiner Docker do Nginx para o preview...')
    try {
      const response = await fetch(`${API_BASE}/workspaces/${wsId}/start`, { method: 'POST' })
      const data = await response.json()
      if (data.status === 'success') {
        addLog('laravel', 'success', `Contêiner crom_ws_${wsId.substring(0,8)} iniciado na porta ${data.workspace.port}`)
        await fetchWorkspaces()
        if (activeWorkspace?.id === wsId) {
          setActiveWorkspace(data.workspace)
        }
      } else {
        addLog('laravel', 'warning', `Falha ao subir Docker: ${data.message}`)
      }
    } catch (err) {
      addLog('laravel', 'warning', 'Erro na requisição para o Docker no backend.')
    }
  }

  // Stop Workspace Nginx Container
  const handleStopDocker = async (wsId: string) => {
    addLog('laravel', 'info', 'Parando e removendo contêiner Docker do preview...')
    try {
      const response = await fetch(`${API_BASE}/workspaces/${wsId}/stop`, { method: 'POST' })
      const data = await response.json()
      if (data.status === 'success') {
        addLog('laravel', 'success', `Contêiner crom_ws_${wsId.substring(0,8)} encerrado.`)
        await fetchWorkspaces()
        if (activeWorkspace?.id === wsId) {
          setActiveWorkspace(data.workspace)
        }
      }
    } catch (err) {
      addLog('laravel', 'warning', 'Erro ao enviar comando de desligamento Docker.')
    }
  }

  // Handle Send Message (Prompt to Laravel -> Go CLI -> Crom Agente)
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return
    if (!activeWorkspace) {
      alert('Por favor, selecione ou crie um Workspace antes de enviar comandos!')
      return
    }

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

    addLog('laravel', 'info', `Chamando processamento para: "${text}"`)
    addLog('laravel', 'info', `Orquestrando binário Go CLI contra o Workspace ID: ${activeWorkspace.id}`)
    
    try {
      const response = await fetch(`${API_BASE}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          workspace_id: activeWorkspace.id
        })
      })
      const data = await response.json()
      
      setAgentStatus('running_go')
      if (data.steps) {
        data.steps.forEach((step: string) => {
          if (step.includes('Erro') || step.includes('offline')) {
            addLog('go', 'warning', step)
          } else {
            addLog('go', 'info', step)
          }
        })
      }

      await new Promise(resolve => setTimeout(resolve, 800))
      setAgentStatus('writing_files')
      
      if (data.status === 'success') {
        // Sync files code viewer
        await syncWorkspaceFiles(activeWorkspace.id)
        
        // Add AI message response
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          steps: data.steps || ['Comando processado com sucesso']
        }])
        setAgentStatus('done')
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: `Erro ao aplicar alterações: ${data.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }])
        setAgentStatus('idle')
      }
    } catch (err) {
      addLog('laravel', 'warning', 'Erro de conexão com o servidor API.')
      setAgentStatus('idle')
    } finally {
      setIsProcessing(false)
      setTimeout(() => setAgentStatus('idle'), 2500)
    }
  }

  // Handle Reset Workspace
  const handleResetWorkspace = async () => {
    if (!activeWorkspace) return
    addLog('laravel', 'info', 'Enviando comando de reset para o workspace...')
    try {
      const response = await fetch(`${API_BASE}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: activeWorkspace.id })
      })
      const data = await response.json()
      if (data.status === 'success') {
        addLog('laravel', 'success', 'Workspace redefinido para o código padrão.')
        await syncWorkspaceFiles(activeWorkspace.id)
      }
    } catch (err) {
      addLog('laravel', 'warning', 'Erro ao redefinir workspace.')
    }
  }

  // Determine iframe source URL
  // If container is active, use Nginx dynamic port, else load local file via Vite public workspaces
  const getIframeSrc = () => {
    if (!activeWorkspace) return ''
    if (activeWorkspace.status === 'running') {
      return `http://localhost:${activeWorkspace.port}`
    }
    // Fallback: renderizar direto do Vite public dev folder
    return `/preview-site/workspaces/${activeWorkspace.id}/index.html`
  }

  // Mock Login Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (loginEmail && loginPassword) {
      setIsAuthenticated(true)
    }
  }

  // Login Screen Render
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
        {/* Gradients */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl -z-10"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl -z-10"></div>

        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md backdrop-blur-md">
          <div className="flex flex-col items-center mb-6">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-500/20 mb-3">
              C
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Crom Nextline Editor</h1>
            <p className="text-xs text-slate-400 mt-1">Plataforma de Edição de Sites por IA Local</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">E-mail</label>
              <input 
                type="email" 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-3 py-2 text-sm text-white outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Senha</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-3 py-2 text-sm text-white outline-none transition-colors"
              />
            </div>
            <button 
              type="submit" 
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              Acessar Workspace
            </button>
          </form>
        </div>
      </div>
    )
  }

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
              Crom Nextline Editor <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono">v1.1.0-Tenancy</span>
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
            <span>Docker Daemon: <strong className="text-slate-200">Ativo</strong></span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-850">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Backend: <strong className="text-slate-200">Laravel 11 (API)</strong></span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-850">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>Go CLI: <strong className="text-slate-200">crom-cli</strong></span>
          </div>
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          {activeWorkspace && (
            <button 
              onClick={handleResetWorkspace}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Resetar Projeto
            </button>
          )}

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
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span> SALVANDO NO DISCO
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
        
        {/* Leftmost Sidebar: Workspaces / Project List */}
        <div className="w-64 border-r border-slate-800 bg-slate-950/40 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400" /> Seus Projetos
            </span>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
              title="Novo Workspace"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Workspaces Scroll list */}
          <div className="flex-grow overflow-y-auto p-2 space-y-1.5">
            {workspaces.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">Nenhum projeto criado ainda.</p>
            ) : (
              workspaces.map((ws) => (
                <div 
                  key={ws.id}
                  onClick={() => handleSelectWorkspace(ws)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-2 ${
                    activeWorkspace?.id === ws.id 
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-md shadow-indigo-600/5' 
                      : 'bg-slate-900/40 border-slate-850 hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate max-w-[150px]">{ws.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                      ws.status === 'running' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {ws.status === 'running' ? 'ON' : 'OFF'}
                    </span>
                  </div>

                  {/* Docker Actions inside card */}
                  <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] font-mono text-slate-400">Porta: {ws.port}</span>
                    <div className="flex gap-1">
                      {ws.status === 'stopped' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartDocker(ws.id)
                          }}
                          className="p-1 rounded bg-slate-800 hover:bg-emerald-600/20 hover:text-emerald-400 text-slate-400 transition-all cursor-pointer"
                          title="Iniciar Contêiner Docker"
                        >
                          <Play className="w-2.5 h-2.5" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStopDocker(ws.id)
                          }}
                          className="p-1 rounded bg-slate-800 hover:bg-rose-600/20 hover:text-rose-400 text-slate-400 transition-all cursor-pointer"
                          title="Parar Contêiner Docker"
                        >
                          <Square className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-slate-950/60 border-t border-slate-850 text-[10px] text-slate-500 text-center shrink-0">
            Conexão com o Docker Socket ativa
          </div>
        </div>

        {/* Center Panel: Chat Control and Logs */}
        <div className="w-[420px] md:w-[450px] shrink-0 border-r border-slate-800 flex flex-col bg-slate-900/40 relative">
          
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
              {activeWorkspace && (
                <div className="px-4 py-2 bg-slate-900/30 border-t border-slate-850 shrink-0">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider">Sugestões rápidas</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Adicionar contato', 'Mudar para tema claro', 'Adicionar depoimentos', 'Alterar título da Hero'].map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(s)}
                        disabled={isProcessing}
                        className="text-xs bg-slate-800 hover:bg-slate-755 text-slate-300 border border-slate-700/60 rounded-md py-1 px-2.5 transition-colors cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                    disabled={isProcessing || !activeWorkspace}
                    placeholder={activeWorkspace ? "Pedir alteração (ex: 'Adicionar seção de contato')..." : "Selecione um workspace primeiro..."}
                    className="flex-grow bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isProcessing || !activeWorkspace}
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
                <span className="font-mono text-slate-300 truncate max-w-[250px]">
                  {activeWorkspace ? activeWorkspace.path : 'Selecione um projeto'}
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
                {activeWorkspace ? (
                  <>
                    <span className="text-emerald-500">
                      {activeWorkspace.status === 'running' 
                        ? `http://localhost:${activeWorkspace.port}` 
                        : `Vite Preview (Offline)`}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-600">http://localhost/preview</span>
                )}
              </div>
              
              {activeWorkspace?.status === 'running' && (
                <a 
                  href={`http://localhost:${activeWorkspace.port}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Abrir em Nova Aba"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
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

            {activeWorkspace ? (
              /* Simulated Device frame */
              <div 
                className={`bg-slate-950 border border-slate-800 shadow-2xl rounded-xl overflow-hidden transition-all duration-300 flex flex-col h-full z-10 ${
                  previewMode === 'desktop' ? 'w-full' :
                  previewMode === 'tablet' ? 'w-[768px]' :
                  'w-[375px] max-w-full'
                }`}
              >
                <iframe
                  title="Live Website Preview"
                  src={getIframeSrc()}
                  className="w-full h-full border-none bg-slate-900"
                  sandbox="allow-scripts allow-forms allow-modals allow-popups"
                />
              </div>
            ) : (
              <div className="z-10 text-center max-w-md p-8 bg-slate-900/50 border border-slate-850 rounded-xl backdrop-blur">
                <FolderOpen className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
                <h3 className="font-bold text-white text-base">Nenhum projeto ativo</h3>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  Crie um novo projeto usando o botão <span className="text-indigo-400 font-bold">+</span> na barra lateral esquerda ou selecione um projeto existente para carregar a pré-visualização.
                </p>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* CREATE WORKSPACE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-bold text-white text-base mb-4">Criar Novo Projeto</h2>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nome do Projeto</label>
                <input 
                  type="text" 
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Ex: Meu Portfólio, Site de Pizzaria"
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-3 py-2 text-sm text-white outline-none transition-colors"
                />
              </div>
              <div className="flex justify-end gap-2 text-xs font-semibold pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors cursor-pointer"
                >
                  Criar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
