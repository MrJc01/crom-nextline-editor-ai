import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LayoutWrapper from './components/LayoutWrapper'
import Home from './pages/Home'
import About from './pages/About'
import Login from './pages/Login'
import WorkspacesIndex from './pages/WorkspacesIndex'
import WorkspaceEditor from './pages/WorkspaceEditor'
import AdminDashboard from './pages/AdminDashboard'
import UserSettings, { type UserPrefs } from './pages/UserSettings'
import CreateWorkspace from './pages/CreateWorkspace'
import { specialistSteps } from './components/SpecialistsPanel'
import type { Workspace, Message, ChatThread, TerminalLog, FileNode, OpenFile } from './types'
import { fetchWithAuth } from './utils/api'

const API_BASE = 'http://localhost:8000/api'

const DEFAULT_PREFS: UserPrefs = { theme: 'dark' }

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

function threadsKey(workspaceId: string): string {
  return `crom-threads-${workspaceId}`
}

function loadThreads(workspaceId: string): ChatThread[] {
  try {
    const savedThreads = JSON.parse(localStorage.getItem(threadsKey(workspaceId)) || 'null')
    if (Array.isArray(savedThreads) && savedThreads.length) {
      return savedThreads
    }
    
    // Migração: se o chat legado existir, converte-o no primeiro thread
    const legacyChat = JSON.parse(localStorage.getItem(`crom-chat-${workspaceId}`) || 'null')
    if (Array.isArray(legacyChat) && legacyChat.length) {
      const thread: ChatThread = {
        id: 'legacy',
        title: 'Histórico Anterior',
        createdAt: new Date().toLocaleString(),
        messages: legacyChat
      }
      return [thread]
    }
  } catch {}
  
  return [{
    id: 'default',
    title: 'Edição Inicial',
    createdAt: new Date().toLocaleString(),
    messages: [welcomeMessage()]
  }]
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
  const lastSavedWorkspaceIdRef = useRef<string | null>(null)
  const [clientPoints, setClientPoints] = useState<number>(500)
  const [allowedModels, setAllowedModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('google/gemini-2.5-flash')

  const [threads, setThreads] = useState<ChatThread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
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
  const fetchWorkspaces = async (): Promise<Workspace[]> => {
    try {
      const response = await fetchWithAuth('/workspaces')
      const data = await response.json()
      if (data.status === 'success') {
        setWorkspaces(data.workspaces)
        return data.workspaces as Workspace[]
      }
    } catch (err) {
      addLog('laravel', 'warning', 'Erro ao conectar ao Laravel Backend na porta 8000.')
    }
    return []
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

  // Fetch settings to discover allowed models and default model
  const fetchSettings = async () => {
    try {
      const response = await fetchWithAuth('/settings')
      const data = await response.json()
      if (data.status === 'success') {
        if (data.settings.allowed_models) {
          try {
            setAllowedModels(JSON.parse(data.settings.allowed_models))
          } catch(e) {}
        }
        if (data.settings.default_model) {
          setSelectedModel(data.settings.default_model)
        }
      }
    } catch (err) {
      console.error('Error fetching settings', err)
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

  // Limpa o histórico de chat da conversa ativa.
  const handleClearChat = () => {
    if (!activeWorkspace || !activeThreadId) return
    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        return { ...t, messages: [welcomeMessage()] }
      }
      return t
    }))
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
    const found = workspaces.find((w: Workspace) => w.id === id)
    if (found) {
      setActiveWorkspace(found)
      const list = loadThreads(found.id)
      setThreads(list)
      if (list.length > 0) {
        setActiveThreadId(list[0].id)
      } else {
        setActiveThreadId(null)
      }
      syncWorkspaceFiles(found.id)
      addLog('laravel', 'info', `Workspace carregado para edição: ${found.name}`)
    } else {
      // Se a lista de workspaces ainda estiver vazia no primeiro render, tenta carregar após fetch
      fetchWorkspaces().then((list) => {
        const retryFound = list.find((w: Workspace) => w.id === id)
        if (retryFound) {
          setActiveWorkspace(retryFound)
          const retryList = loadThreads(retryFound.id)
          setThreads(retryList)
          if (retryList.length > 0) {
            setActiveThreadId(retryList[0].id)
          } else {
            setActiveThreadId(null)
          }
          syncWorkspaceFiles(retryFound.id)
        }
      })
    }
  }

  // Persiste a lista de threads do workspace ativo sempre que ela mudar.
  useEffect(() => {
    if (!activeWorkspace) return

    // Evita salvar os threads do workspace antigo no workspace novo durante transições de state
    if (lastSavedWorkspaceIdRef.current !== activeWorkspace.id) {
      lastSavedWorkspaceIdRef.current = activeWorkspace.id
      return
    }

    if (threads.length > 0) {
      localStorage.setItem(threadsKey(activeWorkspace.id), JSON.stringify(threads))
    }
  }, [threads, activeWorkspace?.id])

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

  // Helper: atualiza as mensagens do thread ativo.
  const pushToActiveThread = (msg: Message) => {
    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        return { ...t, messages: [...t.messages, msg] }
      }
      return t
    }))
  }

  // Helper: cria um novo thread de conversa.
  const handleCreateThread = (title?: string) => {
    const newThread: ChatThread = {
      id: Date.now().toString(),
      title: title || `Conversa ${threads.length + 1}`,
      createdAt: new Date().toLocaleString(),
      messages: [welcomeMessage()]
    }
    setThreads(prev => [newThread, ...prev])
    setActiveThreadId(newThread.id)
  }

  // Helper: deleta um thread de conversa.
  const handleDeleteThread = (threadId: string) => {
    setThreads(prev => {
      const filtered = prev.filter(t => t.id !== threadId)
      if (activeThreadId === threadId) {
        setActiveThreadId(filtered.length > 0 ? filtered[0].id : null)
      }
      return filtered
    })
  }

  // Handle Send Message (Prompt to Laravel -> Go CLI -> Crom Agente)
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return
    if (!activeWorkspace) return

    // Se não há thread ativo, cria um automaticamente com o título do prompt
    if (!activeThreadId) {
      const newThread: ChatThread = {
        id: Date.now().toString(),
        title: text.substring(0, 40),
        createdAt: new Date().toLocaleString(),
        messages: [welcomeMessage()]
      }
      setThreads(prev => [newThread, ...prev])
      setActiveThreadId(newThread.id)
      // Aguarda o próximo ciclo de render para que o state atualize
      await new Promise(r => setTimeout(r, 50))
    }

    // Atualiza o título do thread se for o primeiro prompt do usuário
    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId && (t.title === 'Edição Inicial' || t.title.startsWith('Conversa '))) {
        return { ...t, title: text.substring(0, 40) }
      }
      return t
    }))

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    pushToActiveThread(userMsg)
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
          model: selectedModel
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
        
        pushToActiveThread({
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          // Passos dos especialistas (MoA) + passos técnicos do backend.
          steps: [...specialists, ...(data.steps || [])]
        })
        setAgentStatus('done')
      } else {
        pushToActiveThread({
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: `Erro: ${data.message || 'Falha de processamento'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
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
      fetchSettings()
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
                />
              ) : (
                <Login onLoginSuccess={handleLoginSuccess} />
              )
            } 
          />
          <Route 
            path="/workspace/create" 
            element={
              isAuthenticated ? (
                <CreateWorkspace handleCreateWorkspace={handleCreateWorkspace} />
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
                  threads={threads}
                  activeThreadId={activeThreadId}
                  setActiveThreadId={setActiveThreadId}
                  handleCreateThread={handleCreateThread}
                  handleDeleteThread={handleDeleteThread}
                  inputText={inputText}
                  setInputText={setInputText}
                  isProcessing={isProcessing}
                  previewMode={previewMode}
                  setPreviewMode={setPreviewMode}
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
                  handleLoadWorkspace={handleLoadWorkspace}
                  handleStartDocker={handleStartDocker}
                  handleStopDocker={handleStopDocker}
                  handleSendMessage={handleSendMessage}
                  handleResetWorkspace={handleResetWorkspace}
                  getIframeSrc={getIframeSrc}
                  allowedModels={allowedModels}
                  selectedModel={selectedModel}
                  setSelectedModel={setSelectedModel}
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
