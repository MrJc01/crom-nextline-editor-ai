import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LayoutWrapper from './components/LayoutWrapper'
import Home from './pages/Home'
import About from './pages/About'
import Login from './pages/Login'
import WorkspacesIndex from './pages/WorkspacesIndex'
import WorkspaceEditor from './pages/WorkspaceEditor'
import AdminDashboard from './pages/AdminDashboard'

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
  const [clientPoints, setClientPoints] = useState<number>(500)
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Olá! Sou o assistente Crom. Por favor, digite sua instrução no chat para começarmos a editar o código deste workspace!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'logs'>('preview')
  const [agentStatus, setAgentStatus] = useState<'idle' | 'analyzing' | 'running_go' | 'writing_files' | 'done'>('idle')
  const [files, setFiles] = useState<{ [key: string]: string }>({ 'index.html': 'Carregando arquivos do workspace...' })
  const [selectedFile, setSelectedFile] = useState('index.html')
  

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

  // Fetch client points
  const fetchClientPoints = async () => {
    try {
      const response = await fetch(`${API_BASE}/client-points`)
      const data = await response.json()
      if (data.status === 'success') {
        setClientPoints(data.points)
      }
    } catch (err) {
      console.error('Error fetching client points', err)
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

  // Load a workspace from routing param
  const handleLoadWorkspace = (id: string) => {
    const found = workspaces.find(w => w.id === id)
    if (found) {
      setActiveWorkspace(found)
      syncWorkspaceFiles(found.id)
      addLog('laravel', 'info', `Workspace carregado para edição: ${found.name}`)
    } else {
      // Se a lista de workspaces ainda estiver vazia no primeiro render, tenta carregar após fetch
      fetchWorkspaces().then(() => {
        const retryFound = workspaces.find(w => w.id === id)
        if (retryFound) {
          setActiveWorkspace(retryFound)
          syncWorkspaceFiles(retryFound.id)
        }
      })
    }
  }

  // Handle Create Workspace
  const handleCreateWorkspace = async (name: string): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE}/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      const data = await response.json()
      if (data.status === 'success') {
        addLog('laravel', 'success', `Novo workspace criado: ${data.workspace.name}`)
        await fetchWorkspaces()
        setActiveWorkspace(data.workspace)
        return data.workspace.id
      }
    } catch (err) {
      addLog('laravel', 'warning', 'Falha ao criar workspace no backend.')
    }
    return null
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
      
      if (response.ok && data.status === 'success') {
        await syncWorkspaceFiles(activeWorkspace.id)
        if (data.client_points !== undefined) {
          setClientPoints(data.client_points)
        }
        
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
          text: `Erro: ${data.message || 'Falha de processamento'}`,
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
      fetchClientPoints()
    }
  }, [isAuthenticated])

  return (
    <BrowserRouter>
      <LayoutWrapper isAuthenticated={isAuthenticated} handleLogout={handleLogout} agentStatus={agentStatus} clientPoints={clientPoints}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sobre" element={<About />} />
          <Route 
            path="/login" 
            element={<Login onLoginSuccess={() => setIsAuthenticated(true)} />} 
          />
          <Route 
            path="/admin" 
            element={
              isAuthenticated ? (
                <AdminDashboard />
              ) : (
                <Login onLoginSuccess={() => setIsAuthenticated(true)} />
              )
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? (
                 <WorkspacesIndex 
                  workspaces={workspaces}
                  handleStartDocker={handleStartDocker}
                  handleStopDocker={handleStopDocker}
                  handleCreateWorkspace={handleCreateWorkspace}
                />
              ) : (
                <Login onLoginSuccess={() => setIsAuthenticated(true)} />
              )
            } 
          />
          <Route 
            path="/workspace/:id" 
            element={
              isAuthenticated ? (
                <WorkspaceEditor 
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
                  terminalLogs={terminalLogs}
                  setTerminalLogs={setTerminalLogs}
                  handleLoadWorkspace={handleLoadWorkspace}
                  handleStartDocker={handleStartDocker}
                  handleStopDocker={handleStopDocker}
                  handleSendMessage={handleSendMessage}
                  handleResetWorkspace={handleResetWorkspace}
                  getIframeSrc={getIframeSrc}
                />
              ) : (
                <Login onLoginSuccess={() => setIsAuthenticated(true)} />
              )
            } 
          />
          {/* Fallback redirect to Home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </LayoutWrapper>
    </BrowserRouter>
  )
}
