import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LayoutWrapper from './components/LayoutWrapper'
import Home from './pages/Home'
import About from './pages/About'
import Login from './pages/Login'
import WorkspacesIndex from './pages/WorkspacesIndex'
import WorkspaceEditor from './pages/WorkspaceEditor'
import AdminDashboard from './pages/AdminDashboard'
import UserSettings, { type UserPrefs } from './pages/UserSettings'
import { specialistSteps } from './components/SpecialistsPanel'
import type { Workspace, Message, TerminalLog, FileNode, OpenFile } from './types'
import { fetchWithAuth } from './utils/api'

const API_BASE = 'http://localhost:8000/api'

const DEFAULT_PREFS: UserPrefs = { theme: 'dark', defaultStack: 'static', openrouterKey: '' }

function loadPrefs(): UserPrefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem('crom-user-prefs') || '{}') }
  } catch {
    return DEFAULT_PREFS
  }
}

// --- Histórico de chat por workspace (salvo separadamente por projeto) ---
function welcomeMessage(): Message {
  return {
    id: 'welcome',
    sender: 'ai',
    text: 'Olá! Sou o assistente Crom. Digite sua instrução no chat para editar este workspace.',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}

function chatKey(workspaceId: string): string {
  return `crom-chat-${workspaceId}`
}

function loadChat(workspaceId: string): Message[] {
  try {
    const saved = JSON.parse(localStorage.getItem(chatKey(workspaceId)) || 'null')
    return Array.isArray(saved) && saved.length ? saved : [welcomeMessage()]
  } catch {
    return [welcomeMessage()]
  }
}

// Sessão persistida para sobreviver a reloads (evita cair de volta no login).
function loadSession(): { auth: boolean; role: 'admin' | 'client' } {
  try {
    const s = JSON.parse(localStorage.getItem('crom-session') || '{}')
    return { auth: !!s.auth, role: s.role === 'admin' ? 'admin' : 'client' }
  } catch {
    return { auth: false, role: 'client' }
  }
}

export default function App() {
  const initialSession = loadSession()
  const [isAuthenticated, setIsAuthenticated] = useState(initialSession.auth)
  const [userRole, setUserRole] = useState<'admin' | 'client'>(initialSession.role)
  const [prefs, setPrefsState] = useState<UserPrefs>(loadPrefs)

  const setPrefs = (p: UserPrefs) => {
    setPrefsState(p)
    localStorage.setItem('crom-user-prefs', JSON.stringify(p))
  }

  const handleLoginSuccess = (role: 'admin' | 'client', token: string) => {
    setUserRole(role)
    setIsAuthenticated(true)
    localStorage.setItem('crom-session', JSON.stringify({ auth: true, role }))
    localStorage.setItem('crom-token', token)
  }
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)
  const [clientPoints, setClientPoints] = useState<number>(500)

  const [messages, setMessages] = useState<Message[]>([welcomeMessage()])
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'logs'>('preview')
  const [agentStatus, setAgentStatus] = useState<'idle' | 'analyzing' | 'running_go' | 'writing_files' | 'done'>('idle')
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [treeLoading, setTreeLoading] = useState(false)
  const [openFile, setOpenFile] = useState<OpenFile | null>(null)
  const [reloadKey, setReloadKey] = useState(0)


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
      const response = await fetchWithAuth('/workspaces')
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
      const response = await fetchWithAuth('/client-points')
      const data = await response.json()
      if (data.status === 'success') {
        setClientPoints(data.points)
      }
    } catch (err) {
      console.error('Error fetching client points', err)
    }
  }

  // Busca a árvore de arquivos completa do workspace.
  const syncWorkspaceFiles = async (workspaceId: string) => {
    setTreeLoading(true)
    try {
      const response = await fetchWithAuth(`/files?workspace_id=${workspaceId}`)
      const data = await response.json()
      if (data.status === 'success') {
        const tree: FileNode[] = data.tree || []
        setFileTree(tree)
        // Abre um arquivo inicial: index.html na raiz, senão o primeiro arquivo encontrado.
        const first = findFirstFile(tree)
        if (first) {
          loadFile(workspaceId, first.path)
        } else {
          setOpenFile(null)
        }
      }
    } catch (err) {
      addLog('laravel', 'warning', 'Erro ao buscar arquivos do workspace.')
    } finally {
      setTreeLoading(false)
    }
  }

  // Lê o conteúdo de um arquivo individual.
  const loadFile = async (workspaceId: string, path: string) => {
    try {
      const response = await fetchWithAuth(`/file?workspace_id=${workspaceId}&path=${encodeURIComponent(path)}`)
      const data = await response.json()
      if (data.status === 'success') {
        setOpenFile({ path: data.path, content: data.content, lang: data.lang })
      } else {
        setOpenFile({ path, content: `// ${data.message || 'Não foi possível abrir o arquivo.'}`, lang: 'text' })
      }
    } catch (err) {
      addLog('laravel', 'warning', 'Erro ao ler arquivo do workspace.')
    }
  }

  const handleSelectFile = (path: string) => {
    if (activeWorkspace) loadFile(activeWorkspace.id, path)
  }

  // Salva a edição manual de um arquivo e recarrega o preview.
  const handleSaveFile = async (path: string, content: string): Promise<boolean> => {
    if (!activeWorkspace) return false
    try {
      const response = await fetchWithAuth('/file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: activeWorkspace.id, path, content })
      })
      const data = await response.json()
      if (data.status === 'success') {
        addLog('laravel', 'success', `Arquivo salvo: ${path}`)
        setOpenFile({ path, content, lang: openFile?.lang || 'text' })
        setReloadKey(k => k + 1)
        return true
      }
      addLog('laravel', 'warning', `Falha ao salvar ${path}: ${data.message}`)
      return false
    } catch {
      addLog('laravel', 'warning', 'Erro ao salvar arquivo.')
      return false
    }
  }

  const reloadPreview = () => setReloadKey(k => k + 1)

  // Limpa o histórico de chat do workspace ativo.
  const handleClearChat = () => {
    if (!activeWorkspace) return
    setMessages([welcomeMessage()])
    localStorage.removeItem(chatKey(activeWorkspace.id))
  }

  // Encontra o primeiro arquivo da árvore (prioriza index.html na raiz).
  const findFirstFile = (nodes: FileNode[]): FileNode | null => {
    const rootIndex = nodes.find(n => n.type === 'file' && n.name === 'index.html')
    if (rootIndex) return rootIndex
    for (const n of nodes) {
      if (n.type === 'file') return n
      if (n.children) {
        const inner = findFirstFile(n.children)
        if (inner) return inner
      }
    }
    return null
  }

  // Load a workspace from routing param
  const handleLoadWorkspace = (id: string) => {
    const found = workspaces.find(w => w.id === id)
    if (found) {
      setActiveWorkspace(found)
      setMessages(loadChat(found.id))
      syncWorkspaceFiles(found.id)
      addLog('laravel', 'info', `Workspace carregado para edição: ${found.name}`)
    } else {
      // Se a lista de workspaces ainda estiver vazia no primeiro render, tenta carregar após fetch
      fetchWorkspaces().then(() => {
        const retryFound = workspaces.find(w => w.id === id)
        if (retryFound) {
          setActiveWorkspace(retryFound)
          setMessages(loadChat(retryFound.id))
          syncWorkspaceFiles(retryFound.id)
        }
      })
    }
  }

  // Persiste o histórico de chat do workspace ativo sempre que ele muda.
  useEffect(() => {
    if (activeWorkspace) {
      localStorage.setItem(chatKey(activeWorkspace.id), JSON.stringify(messages))
    }
  }, [messages, activeWorkspace?.id])

  // Handle Create Workspace
  const handleCreateWorkspace = async (name: string, stack: string = 'static'): Promise<string | null> => {
    try {
      const response = await fetchWithAuth('/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, stack })
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

  // Reconcilia o status real de um workspace (usado no polling de boot).
  const pollStatus = async (wsId: string) => {
    try {
      const response = await fetchWithAuth(`/workspaces/${wsId}/status`)
      const data = await response.json()
      if (data.status === 'success' && activeWorkspace?.id === wsId) {
        setActiveWorkspace(data.workspace)
      }
      return data.workspace
    } catch {
      return null
    }
  }

  // Sobe o contêiner de preview, mostrando o estado de transição e o erro real.
  const handleStartDocker = async (wsId: string) => {
    addLog('laravel', 'info', 'Subindo contêiner de preview (detectando stack)...')
    // Feedback otimista de transição.
    if (activeWorkspace?.id === wsId) {
      setActiveWorkspace({ ...activeWorkspace, status: 'starting', last_error: null })
    }
    try {
      const response = await fetchWithAuth(`/workspaces/${wsId}/start`, { method: 'POST' })
      const data = await response.json()
      if (data.status === 'success') {
        const stackLabel = data.workspace.framework
          ? `${data.workspace.stack}/${data.workspace.framework}`
          : data.workspace.stack
        addLog('laravel', 'success', `Preview no ar (${stackLabel}) em ${data.workspace.preview_url}`)
        await fetchWorkspaces()
        if (activeWorkspace?.id === wsId) setActiveWorkspace(data.workspace)
      } else {
        addLog('laravel', 'warning', `Falha ao subir: ${data.error || data.message}`)
        if (activeWorkspace?.id === wsId && data.workspace) setActiveWorkspace(data.workspace)
      }
    } catch (err) {
      addLog('laravel', 'warning', 'Erro na requisição para o Docker no backend.')
      if (activeWorkspace?.id === wsId) {
        setActiveWorkspace({ ...activeWorkspace, status: 'error', last_error: 'Sem resposta do backend.' })
      }
    }
  }

  // Stop Workspace Nginx Container
  const handleStopDocker = async (wsId: string) => {
    addLog('laravel', 'info', 'Parando e removendo contêiner Docker do preview...')
    try {
      const response = await fetchWithAuth(`/workspaces/${wsId}/stop`, { method: 'POST' })
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
      const response = await fetchWithAuth('/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          workspace_id: activeWorkspace.id,
          // Chave própria do usuário (BYO), se configurada nas preferências.
          user_api_key: prefs.openrouterKey || undefined
        })
      })
      const data = await response.json()

      // Simula a cadeia de especialistas (MoA sequencial) analisando o pedido.
      const specialists = specialistSteps(text)
      specialists.forEach(s => addLog('crom-agent', 'info', s))
      
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
        reloadPreview()
        if (data.client_points !== undefined) {
          setClientPoints(data.client_points)
        }
        
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          // Passos dos especialistas (MoA) + passos técnicos do backend.
          steps: [...specialists, ...(data.steps || [])]
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
      const response = await fetchWithAuth('/reset', {
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
      return activeWorkspace.preview_url || `http://localhost:${activeWorkspace.port}`
    }
    // Fallback estático servido pelo backend quando o contêiner está desligado
    // (workspaces em storage/ não são alcançados pelo Vite).
    return `${API_BASE}/workspaces/${activeWorkspace.id}/raw/index.html?k=${reloadKey}`
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUserRole('client')
    setActiveWorkspace(null)
    setWorkspaces([])
    localStorage.removeItem('crom-session')
    localStorage.removeItem('crom-token')
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkspaces()
      fetchClientPoints()
    }
  }, [isAuthenticated])

  return (
    <BrowserRouter>
      <LayoutWrapper isAuthenticated={isAuthenticated} userRole={userRole} handleLogout={handleLogout} agentStatus={agentStatus} clientPoints={clientPoints}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sobre" element={<About />} />
          <Route
            path="/login"
            element={<Login onLoginSuccess={handleLoginSuccess} />}
          />
          <Route
            path="/admin"
            element={
              !isAuthenticated ? (
                <Login onLoginSuccess={handleLoginSuccess} />
              ) : userRole === 'admin' ? (
                <AdminDashboard />
              ) : (
                // Cliente autenticado não acessa o admin — redireciona às suas configurações.
                <Navigate to="/configuracoes" replace />
              )
            }
          />
          <Route
            path="/configuracoes"
            element={
              isAuthenticated ? (
                <UserSettings role={userRole} clientPoints={clientPoints} prefs={prefs} setPrefs={setPrefs} />
              ) : (
                <Login onLoginSuccess={handleLoginSuccess} />
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
                <Login onLoginSuccess={handleLoginSuccess} />
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
                  fileTree={fileTree}
                  treeLoading={treeLoading}
                  openFile={openFile}
                  handleSelectFile={handleSelectFile}
                  handleSaveFile={handleSaveFile}
                  handleClearChat={handleClearChat}
                  reloadPreview={reloadPreview}
                  reloadKey={reloadKey}
                  pollStatus={pollStatus}
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
                <Login onLoginSuccess={handleLoginSuccess} />
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
