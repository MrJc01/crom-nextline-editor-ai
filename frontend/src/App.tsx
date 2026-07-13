import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LayoutWrapper from './components/LayoutWrapper'
import Home from './pages/Home'
import About from './pages/About'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

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

  const addLog = (source: 'laravel' | 'go' | 'crom-agent', type: 'info' | 'success' | 'warning', message: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setTerminalLogs(prev => [...prev, { timestamp: time, source, type, message }])
  }

  // Fetch workspaces
  const fetchWorkspaces = async () => {
    try {
      const response = await fetch(`${API_BASE}/workspaces`)
      const data = await response.json()
      if (data.status === 'success') {
        setWorkspaces(data.workspaces)
      }
    } catch (err) {
      addLog('laravel', 'warning', 'Erro ao conectar ao Laravel Backend na porta 8000.')
    }
  }

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
    addLog('laravel', 'info', `Workspace ativo alterado para: ${ws.name}`)
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
    if (!activeWorkspace) return

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

      await new Promise(resolve => setTimeout(resolve, 850))
      setAgentStatus('writing_files')
      
      if (data.status === 'success') {
        await syncWorkspaceFiles(activeWorkspace.id)
        
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
          text: `Erro: ${data.message}`,
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

  const getIframeSrc = () => {
    if (!activeWorkspace) return ''
    if (activeWorkspace.status === 'running') {
      return `http://localhost:${activeWorkspace.port}`
    }
    return `/preview-site/workspaces/${activeWorkspace.id}/index.html`
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setActiveWorkspace(null)
    setWorkspaces([])
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkspaces()
    }
  }, [isAuthenticated])

  return (
    <BrowserRouter>
      <LayoutWrapper isAuthenticated={isAuthenticated} handleLogout={handleLogout} agentStatus={agentStatus}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sobre" element={<About />} />
          <Route 
            path="/login" 
            element={<Login onLoginSuccess={() => setIsAuthenticated(true)} />} 
          />
          <Route 
            path="/dashboard" 
            element={
              <Dashboard 
                workspaces={workspaces}
                activeWorkspace={activeWorkspace}
                messages={messages}
                inputText={inputText}
                setInputText={setInputText}
                isProcessing={isProcessing}
                previewMode={previewMode}
                setPreviewMode={setPreviewMode}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                files={files}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                isCreateModalOpen={isCreateModalOpen}
                setIsCreateModalOpen={setIsCreateModalOpen}
                newWorkspaceName={newWorkspaceName}
                setNewWorkspaceName={setNewWorkspaceName}
                terminalLogs={terminalLogs}
                setTerminalLogs={setTerminalLogs}
                handleSelectWorkspace={handleSelectWorkspace}
                handleCreateWorkspace={handleCreateWorkspace}
                handleStartDocker={handleStartDocker}
                handleStopDocker={handleStopDocker}
                handleSendMessage={handleSendMessage}
                handleResetWorkspace={handleResetWorkspace}
                getIframeSrc={getIframeSrc}
              />
            } 
          />
        </Routes>
      </LayoutWrapper>
    </BrowserRouter>
  )
}
