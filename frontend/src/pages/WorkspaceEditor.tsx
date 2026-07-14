import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  MessageSquare,
  Send,
  Terminal,
  RefreshCw,
  Laptop,
  Smartphone,
  Tablet,
  FolderTree,
  Sparkles,
  FileCode,
  HardDrive,
  Play,
  Square,
  ExternalLink,
  ArrowLeft,
  Server,
  Loader2,
  AlertTriangle,
  Layers,
  Save,
  Pencil,
  X,
  Trash2,
  Settings,
  Download,
} from 'lucide-react'
import FileTree from '../components/FileTree'
import SpecialistsPanel from '../components/SpecialistsPanel'
import { fetchWithAuth } from '../utils/api'
import type { Workspace, Message, ChatThread, FileNode, OpenFile } from '../types'

interface WorkspaceEditorProps {
  activeWorkspace: Workspace | null
  threads: ChatThread[]
  activeThreadId: string | null
  setActiveThreadId: (id: string | null) => void
  handleCreateThread: (title?: string) => void
  handleDeleteThread: (threadId: string) => void
  inputText: string
  setInputText: (val: string) => void
  isProcessing: boolean
  previewMode: 'desktop' | 'tablet' | 'mobile'
  setPreviewMode: (val: 'desktop' | 'tablet' | 'mobile') => void
  fileTree: FileNode[]
  treeLoading: boolean
  openFile: OpenFile | null
  setOpenFile: (val: OpenFile | null) => void
  handleSelectFile: (path: string) => void
  handleSaveFile: (path: string, content: string) => Promise<boolean>
  handleClearChat: () => void
  reloadPreview: () => void
  reloadKey: number
  pollStatus: (wsId: string) => Promise<Workspace | null>
  terminalLogs: any[]
  handleLoadWorkspace: (id: string) => void
  handleStartDocker: (wsId: string) => void
  handleStopDocker: (wsId: string) => void
  handleSendMessage: (text: string) => void
  handleResetWorkspace: () => void
  getIframeSrc: () => string
  allowedModels: string[]
  selectedModel: string
  setSelectedModel: (val: string) => void
  addLog: (source: 'laravel' | 'go' | 'crom-agent', type: 'info' | 'success' | 'warning', message: string) => void
}

const STACK_LABELS: Record<string, string> = {
  static: 'Estático · Nginx',
  node: 'Node',
  php: 'PHP',
  go: 'Go',
  python: 'Python',
}

function stackLabel(ws: Workspace): string {
  if (!ws.stack) return 'Detectando...'
  const base = STACK_LABELS[ws.stack] || ws.stack
  if (ws.framework && ws.stack !== 'static') {
    return `${base} · ${ws.framework}`
  }
  return base
}

function StatusBadge({ status }: { status: Workspace['status'] }) {
  const map = {
    running: { txt: 'Servidor ON', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    starting: { txt: 'Subindo', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    error: { txt: 'Erro', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
    stopped: { txt: 'Servidor OFF', cls: 'bg-slate-800 text-slate-400 border-slate-700' },
  } as const
  const s = map[status] || map.stopped
  return (
    <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase border ${s.cls}`}>
      {s.txt}
    </span>
  )
}

export default function WorkspaceEditor({
  activeWorkspace,
  addLog,
  threads,
  activeThreadId,
  setActiveThreadId,
  handleCreateThread,
  handleDeleteThread,
  inputText,
  setInputText,
  isProcessing,
  previewMode,
  setPreviewMode,
  fileTree,
  treeLoading,
  openFile,
  setOpenFile,
  handleSelectFile,
  handleSaveFile,
  handleClearChat,
  reloadPreview,
  reloadKey,
  pollStatus,
  terminalLogs,
  handleLoadWorkspace,
  handleStartDocker,
  handleStopDocker,
  handleSendMessage,
  handleResetWorkspace,
  getIframeSrc,
  allowedModels,
  selectedModel,
  setSelectedModel
}: WorkspaceEditorProps) {
  const { id } = useParams<{ id: string }>()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Local tabs state
  const [activeLeftTab, setActiveLeftTab] = useState<'chat' | 'settings'>('chat')
  const [activeRightTab, setActiveRightTab] = useState<'preview' | 'code'>('preview')
  const [activeMobileView, setActiveMobileView] = useState<'chat' | 'preview' | 'code'>('chat')
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false)
  const [dockerLogs, setDockerLogs] = useState<string>('')

  const selectMobileView = (view: 'chat' | 'preview' | 'code') => {
    setActiveMobileView(view);
    if (view === 'preview') {
      setActiveRightTab('preview');
    } else if (view === 'code') {
      setActiveRightTab('code');
    }
  };

  // Multi-thread views state
  const [chatView, setChatView] = useState<'list' | 'chat'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [isServerReady, setIsServerReady] = useState(false)

  // Polling de conexão com o servidor interno do preview
  useEffect(() => {
    if (!activeWorkspace || activeWorkspace.status !== 'running') {
      setIsServerReady(false)
      return
    }

    if (isServerReady) return

    let isMounted = true
    let retries = 0
    const maxRetries = 20

    const checkServer = async () => {
      if (!isMounted) return

      const checkUrl = getIframeSrc()
      try {
        // Realiza um fetch no-cors para contornar restrições de CORS.
        // Falha com exceção de rede se a porta estiver fechada.
        await fetch(checkUrl, { method: 'GET', mode: 'no-cors', cache: 'no-store' })

        if (isMounted) {
          setIsServerReady(true)
          reloadPreview() // Força a recarga imediata do iframe com o site atualizado
        }
      } catch (err) {
        if (isMounted && retries < maxRetries) {
          retries++
          setTimeout(checkServer, 1000)
        } else if (isMounted) {
          // Fallback para não travar a UI indefinidamente
          setIsServerReady(true)
          reloadPreview()
        }
      }
    }

    // Atraso inicial curto para dar tempo do contêiner subir
    const initialDelay = setTimeout(checkServer, 500)

    return () => {
      isMounted = false
      clearTimeout(initialDelay)
    }
  }, [activeWorkspace?.status, activeWorkspace?.id, reloadKey, isServerReady])

  // Derive active thread messages
  const activeThread = threads.find(t => t.id === activeThreadId)
  const messages = activeThread ? activeThread.messages : []

  // Último pedido do usuário, para contextualizar o painel de especialistas.
  const lastUserPrompt = [...messages].reverse().find(m => m.sender === 'user')?.text ?? ''

  // Load the target workspace from route param id
  useEffect(() => {
    if (id) {
      handleLoadWorkspace(id)
    }
  }, [id])

  // Ao trocar de arquivo, sai do modo de edição e reseta o rascunho.
  useEffect(() => {
    setEditing(false)
    setDraft(openFile?.content ?? '')
  }, [openFile?.path])

  // Captura erros de JavaScript e mensagens de console.error/warn enviados do Preview
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'object') {
        if (event.data.type === 'iframe-js-error') {
          const { message, source, lineno, colno, stack } = event.data;
          addLog(
            'go',
            'warning',
            `[JS Error] ${message} em ${source || 'origem'}:${lineno}:${colno}`
          );
          if (stack) {
            console.error('[Preview JS Error Stack]', stack);
          }
        } else if (event.data.type === 'iframe-console-error') {
          addLog('go', 'warning', `[console.error] ${event.data.message}`);
        } else if (event.data.type === 'iframe-console-warn') {
          addLog('go', 'info', `[console.warn] ${event.data.message}`);
        }
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [addLog]);

  const onSave = async () => {
    if (!openFile) return
    setSaving(true)
    const ok = await handleSaveFile(openFile.path, draft)
    setSaving(false)
    if (ok) setEditing(false)
  }

  const handleDownloadZip = async () => {
    if (!activeWorkspace) return
    setDownloading(true)
    try {
      const response = await fetchWithAuth(`/workspaces/${activeWorkspace.id}/download`)
      if (!response.ok) {
        throw new Error('Falha ao baixar o arquivo ZIP.')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeWorkspace.slug || 'workspace'}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('Erro ao baixar o arquivo ZIP do workspace.')
    } finally {
      setDownloading(false)
    }
  }

  const fetchDockerLogs = async () => {
    if (!activeWorkspace || activeWorkspace.status !== 'running') {
      setDockerLogs('Contêiner offline ou inicializando.')
      return
    }
    try {
      const res = await fetchWithAuth(`/workspaces/${activeWorkspace.id}/logs`)
      const data = await res.json()
      if (data.status === 'success') {
        setDockerLogs(data.logs || 'Sem logs do contêiner.')
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Poll docker logs periodically when expanded and container is running
  useEffect(() => {
    if (!isTerminalExpanded || !activeWorkspace || activeWorkspace.status !== 'running') return
    fetchDockerLogs()
    const interval = setInterval(fetchDockerLogs, 4000)
    return () => clearInterval(interval)
  }, [isTerminalExpanded, activeWorkspace?.status, activeWorkspace?.id])

  // Enquanto o servidor está subindo, reconcilia o status até virar running/error.
  useEffect(() => {
    if (!activeWorkspace || activeWorkspace.status !== 'starting') return
    const timer = setInterval(() => pollStatus(activeWorkspace.id), 2500)
    return () => clearInterval(timer)
  }, [activeWorkspace?.status, activeWorkspace?.id])

  // Revalida o status real ao voltar o foco para a aba (pode ter mudado por fora).
  useEffect(() => {
    if (!activeWorkspace) return
    const onFocus = () => pollStatus(activeWorkspace.id)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [activeWorkspace?.id])

  if (!activeWorkspace) {
    return (
      <div className="flex-grow flex items-center justify-center p-6 bg-slate-950">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 text-xs font-semibold">Carregando dados do workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-grow flex flex-col overflow-hidden bg-slate-950">

      {/* Editor Inner Navigation Header */}
      <header className="flex items-center justify-between border-b border-slate-900 bg-slate-950/60 px-6 py-3.5 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="h-4 w-px bg-slate-800"></div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {activeWorkspace.name}
              <StatusBadge status={activeWorkspace.status} />
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-550 font-mono">
              <Layers className="w-3 h-3 text-indigo-400/70" />
              <span>{stackLabel(activeWorkspace)}</span>
            </div>
          </div>
        </div>

        {/* Quick Docker control actions directly in header */}
        <div className="flex items-center gap-3">
          {activeWorkspace.status === 'running' ? (
            <button
              onClick={() => handleStopDocker(activeWorkspace.id)}
              className="flex items-center gap-1 text-[10px] bg-slate-900 hover:bg-rose-650/15 hover:text-rose-455 border border-slate-800 hover:border-rose-500/25 px-2.5 py-1 rounded transition-all cursor-pointer font-bold"
              title="Parar contêiner de preview"
            >
              <Square className="w-3 h-3 text-rose-500" /> Parar Servidor
            </button>
          ) : (
            <button
              onClick={() => handleStartDocker(activeWorkspace.id)}
              disabled={activeWorkspace.status === 'starting'}
              className="flex items-center gap-1 text-[10px] bg-slate-900 hover:bg-emerald-650/15 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/25 px-2.5 py-1 rounded transition-all cursor-pointer font-bold disabled:opacity-50 disabled:cursor-wait"
              title="Iniciar contêiner de preview"
            >
              {activeWorkspace.status === 'starting'
                ? <><Loader2 className="w-3 h-3 text-emerald-500 animate-spin" /> Subindo...</>
                : <><Play className="w-3 h-3 text-emerald-500" /> Iniciar Servidor</>}
            </button>
          )}
        </div>
      </header>

      {/* Main Content Split layout */}
      <div className="flex flex-grow w-full overflow-hidden relative">

        {/* Left Panel: Chat Control / Settings */}
        <div className={`
          ${activeMobileView === 'chat' ? 'flex' : 'hidden md:flex'}
          w-full md:w-[450px] shrink-0 border-r border-slate-900 flex flex-col bg-slate-900/40 relative
        `}>
          {/* Tabs header */}
          <div className="flex border-b border-slate-900 bg-slate-950/20 text-xs shrink-0 select-none">
            <button
              onClick={() => setActiveLeftTab('chat')}
              className={`flex-1 py-3 px-4 font-semibold text-center transition-all flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${activeLeftTab === 'chat' ? 'border-indigo-500 text-white bg-slate-900/40' : 'border-transparent text-slate-450 hover:text-slate-200'
                }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat de Comando
            </button>
            <button
              onClick={() => setActiveLeftTab('settings')}
              className={`flex-1 py-3 px-4 font-semibold text-center transition-all flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${activeLeftTab === 'settings' ? 'border-indigo-500 text-white bg-slate-900/40' : 'border-transparent text-slate-450 hover:text-slate-200'
                }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Configurações
            </button>
          </div>

          {/* TAB CONTENT: CHAT */}
          {activeLeftTab === 'chat' && (
            chatView === 'list' ? (
              // VISTA 1: Lista de Chats e Conversas
              <div className="flex-grow flex flex-col overflow-hidden">
                {/* Header da Lista com Pesquisa e Nova Conversa */}
                <div className="p-4 border-b border-slate-900 bg-slate-950/20 shrink-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      Conversas ({threads.length})
                    </span>
                    <button
                      onClick={() => {
                        handleCreateThread()
                        setChatView('chat')
                      }}
                      className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-all shadow-md cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Nova Conversa
                    </button>
                  </div>

                  {/* Campo de Busca */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Pesquisar conversa..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-355 cursor-pointer bg-transparent border-none"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de Conversas */}
                <div className="flex-grow overflow-y-auto p-3 space-y-2 select-none">
                  {threads.filter(t =>
                    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.messages.some(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
                  ).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs text-center space-y-2">
                      <MessageSquare className="w-8 h-8 text-slate-600 opacity-60" />
                      <span>Nenhuma conversa encontrada</span>
                    </div>
                  ) : (
                    threads.filter(t =>
                      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      t.messages.some(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
                    ).map((thread) => {
                      const isActive = thread.id === activeThreadId
                      const lastMsg = thread.messages[thread.messages.length - 1]
                      const snippet = lastMsg ? lastMsg.text : 'Sem mensagens'

                      return (
                        <div
                          key={thread.id}
                          onClick={() => {
                            setActiveThreadId(thread.id)
                            setChatView('chat')
                          }}
                          className={`group flex items-start justify-between p-3 rounded-lg border cursor-pointer transition-all ${isActive
                            ? 'bg-indigo-650/15 border-indigo-500/50 text-white shadow-sm'
                            : 'bg-slate-900/25 border-slate-800 hover:bg-slate-900/55 hover:border-slate-700/60 text-slate-300'
                            }`}
                        >
                          <div className="flex-grow min-w-0 pr-2">
                            <div className="flex items-center justify-between mb-1 gap-2">
                              <span className="font-bold text-xs truncate group-hover:text-white transition-colors">
                                {thread.title}
                              </span>
                              <span className="text-[9px] text-slate-500 font-medium shrink-0">
                                {thread.createdAt ? thread.createdAt.split(' ')[0] : ''}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-450 truncate line-clamp-1">
                              {snippet}
                            </p>
                          </div>

                          {/* Botão de Deletar Thread */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteThread(thread.id)
                            }}
                            className="text-slate-550 hover:text-rose-450 p-1 rounded hover:bg-slate-800/60 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0 border-none bg-transparent"
                            title="Excluir conversa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ) : (
              // VISTA 2: Chat Aberto (com botão de voltar)
              <div className="flex-grow flex flex-col overflow-hidden">
                {/* Header do Chat Aberto */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-900 bg-slate-950/20 shrink-0 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => setChatView('list')}
                      className="flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/80 transition-all cursor-pointer shrink-0 border-none bg-transparent"
                      title="Voltar para a lista"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-200 truncate select-all">
                        {activeThread?.title}
                      </h4>
                      <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider block mt-0.5">
                        Histórico Ativo
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleClearChat}
                      className="flex items-center gap-1 text-[10px] text-slate-450 hover:text-rose-455 font-semibold transition-colors cursor-pointer px-2 py-1 rounded bg-slate-950/30 hover:bg-slate-950/60 border border-slate-900"
                      title="Limpar mensagens desta conversa"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Limpar
                    </button>
                  </div>
                </div>

                {/* Histórico de Mensagens */}
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                  {messages.map((msg: Message) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                    >
                      <div
                        className={`rounded-xl px-4 py-3 text-sm leading-relaxed shadow-md whitespace-pre-wrap ${msg.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-bl-none'
                          }`}
                      >
                        {msg.text}

                        {msg.steps && (
                          <div className="mt-3 pt-2.5 border-t border-slate-700/60 text-xs text-slate-400 space-y-2">
                            <div className="font-semibold text-slate-350 flex items-center gap-1.5 mb-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                              Ações concluídas pelo agente:
                            </div>
                            {msg.steps.map((step, idx) => {
                              const separatorIndex = step.indexOf(': ')
                              const name = separatorIndex !== -1 ? step.substring(0, separatorIndex) : ''
                              const desc = separatorIndex !== -1 ? step.substring(separatorIndex + 2) : step
                              const isSpecialist = [
                                'Arquiteto de Layout',
                                'Especialista em UX/UI',
                                'Engenheiro Frontend',
                                'Revisor de Código',
                                'Agregador Crom'
                              ].includes(name)

                              if (isSpecialist) {
                                return (
                                  <div key={idx} className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-2.5 my-1 space-y-1">
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400">
                                      <span className="w-1 h-3 rounded-full bg-indigo-500"></span>
                                      {name}
                                    </div>
                                    <p className="text-[11px] text-slate-300 leading-snug">{desc}</p>
                                  </div>
                                )
                              }

                              return (
                                <div key={idx} className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono pl-1">
                                  <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                  {step}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-550 mt-1 px-1">
                        {msg.timestamp}
                      </span>
                    </div>
                  ))}

                  {isProcessing && (
                    <div className="flex flex-col w-full mr-auto items-start gap-2">
                      <div className="rounded-xl px-4 py-3 bg-slate-800/60 border border-slate-700/50 text-slate-450 text-sm rounded-bl-none flex items-center gap-2">
                        <span className="flex gap-1 items-center">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"></span>
                        </span>
                        <span>Orquestrando especialistas...</span>
                      </div>
                      <SpecialistsPanel active={isProcessing} prompt={lastUserPrompt} />
                    </div>
                  )}
                </div>

                {/* Form Input do Chat */}
                <div className="p-4 pb-24 md:pb-4 border-t border-slate-900 bg-slate-900 shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSendMessage(inputText)
                    }}
                    className="flex items-center gap-2 bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 focus-within:border-indigo-500/80 transition-all shadow-inner"
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
                      className="h-8 w-8 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors disabled:bg-slate-800 disabled:text-slate-650 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            )
          )}

          {/* TAB CONTENT: SETTINGS */}
          {activeLeftTab === 'settings' && (
            <div className="flex-grow overflow-y-auto p-5 space-y-5 select-text">
              <div className="border-b border-slate-900 pb-4">
                <h3 className="text-sm font-bold text-white">Configurações do Workspace</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Gerenciamento de stack e metadados do projeto.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Nome do Workspace</label>
                  <div className="text-xs text-slate-300 font-semibold bg-slate-950 border border-slate-900 rounded-lg p-2.5">
                    {activeWorkspace.name}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Identificador Slug</label>
                  <div className="text-xs text-slate-400 font-mono bg-slate-950 border border-slate-900 rounded-lg p-2.5 select-all">
                    {activeWorkspace.slug || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Stack Operacional</label>
                  <div className="text-xs text-slate-400 font-mono bg-slate-950 border border-slate-900 rounded-lg p-2.5">
                    {stackLabel(activeWorkspace)}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Modelo de Inteligência Artificial (LLM)
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={isProcessing}
                    className="w-full bg-slate-950 border border-slate-900 text-xs text-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 transition-colors"
                  >
                    {allowedModels.length > 0 ? (
                      allowedModels.map(modelId => (
                        <option key={modelId} value={modelId}>
                          {modelId.split('/').pop()?.toUpperCase() || modelId}
                        </option>
                      ))
                    ) : (
                      <option value={selectedModel}>{selectedModel.split('/').pop()?.toUpperCase() || selectedModel}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">ID do Contêiner Docker</label>
                  <div className="text-xs text-slate-500 font-mono bg-slate-950 border border-slate-900 rounded-lg p-2.5 truncate" title={activeWorkspace.container_id || 'N/A'}>
                    {activeWorkspace.container_id || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Caminho no Servidor Host</label>
                  <div className="text-xs text-slate-500 font-mono bg-slate-950 border border-slate-900 rounded-lg p-2.5 select-all break-all">
                    {activeWorkspace.path}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleResetWorkspace}
                    className="w-full py-2 bg-slate-900 hover:bg-rose-950/25 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-455 text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    Resetar arquivos para o estado padrão
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Preview & Code (Toggled in same area) + Bottom logs */}
        <div className={`
          ${activeMobileView !== 'chat' ? 'flex' : 'hidden md:flex'}
          flex-grow flex flex-col bg-slate-950 overflow-hidden relative
        `}>

          {/* Header Toggle tabs */}
          <div className="flex items-center justify-between bg-slate-950 border-b border-slate-900 text-xs shrink-0 select-none pr-4">
            <div className="flex">
              <button
                onClick={() => { setActiveRightTab('preview'); setActiveMobileView('preview'); }}
                className={`py-3 px-6 font-bold text-center transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${activeRightTab === 'preview' ? 'border-indigo-500 text-white bg-slate-900/20' : 'border-transparent text-slate-450 hover:text-slate-200'
                  }`}
              >
                <Laptop className="w-3.5 h-3.5 text-indigo-400" />
                Visualização (Preview)
              </button>
              <button
                onClick={() => { setActiveRightTab('code'); setActiveMobileView('code'); }}
                className={`py-3 px-6 font-bold text-center transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${activeRightTab === 'code' ? 'border-indigo-500 text-white bg-slate-900/20' : 'border-transparent text-slate-450 hover:text-slate-200'
                  }`}
              >
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                Código Fonte
              </button>
            </div>

            <button
              onClick={handleDownloadZip}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 hover:text-indigo-400 border border-slate-800 text-[10px] text-slate-355 font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Baixar todos os arquivos como arquivo ZIP"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 text-indigo-450 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-indigo-400" />
              )}
              {downloading ? 'Baixando...' : 'Baixar ZIP'}
            </button>
          </div>

          {/* VIEWPORT CONTROLLER: PREVIEW */}
          {activeRightTab === 'preview' && (
            <div className="flex-grow flex flex-col overflow-hidden relative">
              {/* Iframe Control Bar */}
              <div className="flex items-center justify-between px-6 py-2 bg-slate-900/50 border-b border-slate-900 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/70"></span>
                  <span className="w-3 h-3 rounded-full bg-yellow-500/70"></span>
                  <span className="w-3 h-3 rounded-full bg-green-500/70"></span>
                  <div className="ml-4 h-6 px-3 rounded bg-slate-950/60 border border-slate-900 text-[10px] font-mono flex items-center gap-1.5 w-64 md:w-80 select-all">
                    <span className={activeWorkspace.status === 'running' ? 'text-emerald-500' : 'text-slate-500'}>
                      {activeWorkspace.status === 'running'
                        ? activeWorkspace.preview_url
                        : activeWorkspace.status === 'starting'
                          ? 'Subindo contêiner...'
                          : 'Servidor desligado'}
                    </span>
                  </div>

                  {activeWorkspace.status === 'running' && (
                    <a
                      href={activeWorkspace.preview_url || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      title="Abrir em Nova Aba"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    onClick={reloadPreview}
                    className="flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-355 font-bold border border-slate-700 rounded px-2.5 py-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Recarregar
                  </button>


                </div>

                {/* Screen Toggles */}
                <div className="flex items-center gap-1.5 bg-slate-950/50 p-1 rounded-md border border-slate-900">
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className={`p-1.5 rounded transition-colors cursor-pointer ${previewMode === 'desktop' ? 'bg-indigo-650 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPreviewMode('tablet')}
                    className={`p-1.5 rounded transition-colors cursor-pointer ${previewMode === 'tablet' ? 'bg-indigo-650 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <Tablet className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className={`p-1.5 rounded transition-colors cursor-pointer ${previewMode === 'mobile' ? 'bg-indigo-650 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Iframe Viewport Container */}
              <div className="flex-grow flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25"></div>

                <div
                  className={`bg-slate-950 border border-slate-900 shadow-2xl rounded-xl overflow-hidden transition-all duration-300 flex flex-col h-full z-10 ${previewMode === 'desktop' ? 'w-full' :
                    previewMode === 'tablet' ? 'w-[768px]' :
                      'w-[375px] max-w-full'
                    }`}
                >
                  <iframe
                    key={reloadKey}
                    title="Live Website Preview"
                    src={getIframeSrc()}
                    className="w-full h-full border-none bg-slate-900"
                    sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                  />

                  {/* Overlay de estado quando o servidor não está no ar */}
                  {(activeWorkspace.status !== 'running' || !isServerReady) && (
                    <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-sm flex items-center justify-center p-6 z-20">
                      <div className="text-center max-w-sm space-y-4">
                        {(activeWorkspace.status === 'starting' || (activeWorkspace.status === 'running' && !isServerReady)) ? (
                          <>
                            <Loader2 className="w-10 h-10 text-amber-400 mx-auto animate-spin" />
                            <h4 className="text-white font-bold text-sm">
                              {activeWorkspace.status === 'starting' ? 'Subindo o servidor de preview' : 'Aguardando resposta do servidor...'}
                            </h4>
                            <p className="text-slate-400 text-xs leading-relaxed">
                              {activeWorkspace.status === 'starting'
                                ? `Detectando a stack (${stackLabel(activeWorkspace)}), instalando dependências e iniciando o contêiner...`
                                : 'O contêiner foi iniciado. Aguardando a inicialização da aplicação interna na porta...'}
                            </p>
                          </>
                        ) : activeWorkspace.status === 'error' ? (
                          <>
                            <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
                            <h4 className="text-white font-bold text-sm">Falha ao subir o servidor</h4>
                            {activeWorkspace.last_error && (
                              <pre className="text-left text-[10px] text-rose-300/90 bg-rose-500/5 border border-rose-500/20 rounded-lg p-3 max-h-32 overflow-auto whitespace-pre-wrap font-mono">
                                {activeWorkspace.last_error}
                              </pre>
                            )}
                            <button
                              onClick={() => handleStartDocker(activeWorkspace.id)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto">
                              <Server className="w-7 h-7 text-slate-500" />
                            </div>
                            <h4 className="text-white font-bold text-sm">Servidor desligado</h4>
                            <p className="text-slate-450 text-xs leading-relaxed">
                              O contêiner de preview deste workspace ({stackLabel(activeWorkspace)}) está parado.
                              Ligue para ver o projeto rodando de verdade em <span className="font-mono text-slate-350 select-all">{activeWorkspace.preview_url}</span>.
                            </p>
                            <button
                              onClick={() => handleStartDocker(activeWorkspace.id)}
                              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-600/20 transition-colors cursor-pointer"
                            >
                              <Play className="w-4 h-4" /> Ligar Servidor
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEWPORT CONTROLLER: SOURCE CODE */}
          {activeRightTab === 'code' && (
            <div className="flex-grow flex overflow-hidden">
              {/* Árvore de arquivos recursiva */}
              <div className={`
                ${openFile ? 'hidden md:flex' : 'flex'}
                w-full md:w-[28%] md:min-w-[150px] border-r border-slate-900 flex flex-col overflow-hidden bg-slate-950/30
              `}>
                <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-950/40 border-b border-slate-900 text-[11px] text-slate-400 shrink-0 select-none">
                  <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Arquivos do Projeto</span>
                </div>
                <div className="flex-grow overflow-auto px-1.5">
                  <FileTree
                    tree={fileTree}
                    selectedPath={openFile?.path ?? null}
                    onSelect={(node) => handleSelectFile(node.path)}
                    loading={treeLoading}
                  />
                </div>
              </div>

              {/* Conteúdo do arquivo selecionado */}
              <div className={`
                ${!openFile ? 'hidden md:flex' : 'flex'}
                flex-grow flex flex-col overflow-hidden
              `}>
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-950/40 border-b border-slate-900 text-[11px] shrink-0 select-none">
                  <span className="flex items-center gap-1.5 min-w-0">
                    {/* Back arrow on mobile to show file tree */}
                    <button
                      onClick={() => setOpenFile(null)}
                      className="md:hidden p-1 mr-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                      title="Voltar para arquivos"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <FileCode className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="font-mono text-slate-300 truncate">{openFile?.path || 'Selecione um arquivo'}</span>
                  </span>
                  {openFile && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {editing ? (
                        <>
                          <button
                            onClick={onSave}
                            disabled={saving}
                            className="flex items-center gap-1 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-1 rounded transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Salvar
                          </button>
                          <button
                            onClick={() => { setEditing(false); setDraft(openFile.content) }}
                            className="flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" /> Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setDraft(openFile.content); setEditing(true) }}
                          className="flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-indigo-650/20 hover:text-indigo-300 text-slate-300 px-2 py-1 rounded transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" /> Editar
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {editing ? (
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    spellCheck={false}
                    className="flex-grow resize-none p-4 bg-slate-950 font-mono text-xs text-slate-200 leading-relaxed outline-none border-none"
                  />
                ) : (
                  <div className="flex-grow overflow-auto p-4 bg-slate-950/90 font-mono text-xs text-slate-350 leading-relaxed">
                    <pre className="whitespace-pre">{openFile ? openFile.content : 'Nenhum arquivo aberto.'}</pre>
                  </div>
                )}
                <div className="p-3 pb-20 md:pb-3 bg-slate-900 border-t border-slate-900 text-[11px] text-slate-450 flex items-center justify-between shrink-0 select-none">
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3 text-slate-500" />
                    Raiz no disco
                  </span>
                  <span className="font-mono text-slate-400 truncate max-w-[220px]">
                    {activeWorkspace.path}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Drawer: Logs & Terminal */}
          <div
            className="border-t border-slate-900 bg-slate-950 shrink-0 z-30 flex flex-col transition-all duration-300"
            style={{ height: isTerminalExpanded ? '230px' : '36px' }}
          >
            {/* Header */}
            <div
              onClick={() => setIsTerminalExpanded(!isTerminalExpanded)}
              className="flex items-center justify-between px-6 py-2 bg-slate-900/40 border-b border-slate-950 text-xs font-semibold cursor-pointer hover:bg-slate-900/60 transition-colors shrink-0 select-none"
            >
              <div className="flex items-center gap-2 text-slate-300">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>Logs & Terminal de Execução do Docker</span>
                {activeWorkspace.status === 'running' && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-500 font-mono font-normal">Clique para {isTerminalExpanded ? 'minimizar' : 'expandir'}</span>
                <button className="text-[10px] text-slate-400 hover:text-white font-mono">
                  {isTerminalExpanded ? '▼' : '▲'}
                </button>
              </div>
            </div>

            {/* Body */}
            {isTerminalExpanded && (
              <div className="flex-grow flex overflow-hidden">
                {/* Col 1: System Logs (Laravel/CLI) */}
                <div className="w-[50%] border-r border-slate-900/60 flex flex-col overflow-hidden">
                  <div className="px-4 py-1.5 bg-slate-900/10 border-b border-slate-900/40 text-[10px] text-slate-500 uppercase tracking-wider font-bold select-none">Logs do Sistema (Laravel & CLI)</div>
                  <div className="flex-grow p-3 overflow-y-auto font-mono text-[10px] space-y-1.5 bg-slate-950 select-text">
                    {terminalLogs.length === 0 ? (
                      <p className="text-slate-600 italic">Nenhum log de sistema.</p>
                    ) : (
                      terminalLogs.map((log: any, idx: number) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <span className="text-slate-600">[{log.timestamp}]</span>
                          <span className={`px-1 py-0.2 rounded text-[8px] font-extrabold uppercase ${log.source === 'laravel' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            }`}>
                            {log.source}
                          </span>
                          <span className={log.type === 'error' ? 'text-rose-400' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-400'}>
                            {log.message}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Col 2: Docker Container Output */}
                <div className="w-[50%] flex flex-col overflow-hidden">
                  <div className="px-4 py-1.5 bg-slate-900/10 border-b border-slate-900/40 text-[10px] text-slate-500 uppercase tracking-wider font-bold select-none flex justify-between items-center">
                    <span>Console do Contêiner Docker ({stackLabel(activeWorkspace)})</span>
                    <button
                      onClick={fetchDockerLogs}
                      className="text-[9px] text-indigo-400 hover:text-indigo-300 font-mono cursor-pointer"
                    >
                      Atualizar
                    </button>
                  </div>
                  <div className="flex-grow p-3 overflow-y-auto font-mono text-[10px] bg-black text-slate-350 select-text whitespace-pre-wrap leading-relaxed">
                    {dockerLogs ? dockerLogs : "Nenhum output de contêiner ou contêiner offline."}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating bottom tab bar on mobile */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-800 rounded-full py-2 px-3.5 shadow-2xl flex items-center gap-3 backdrop-blur z-30 md:hidden">
        <button
          onClick={() => selectMobileView('chat')}
          className={`px-4 py-2 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeMobileView === 'chat' ? 'bg-indigo-600 text-white bg-opacity-100' : 'text-slate-400 hover:text-white'
            }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Chat
        </button>
        <button
          onClick={() => selectMobileView('preview')}
          className={`px-4 py-2 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeMobileView === 'preview' ? 'bg-indigo-600 text-white bg-opacity-100' : 'text-slate-400 hover:text-white'
            }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          Preview
        </button>
        <button
          onClick={() => selectMobileView('code')}
          className={`px-4 py-2 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${activeMobileView === 'code' ? 'bg-indigo-600 text-white bg-opacity-100' : 'text-slate-400 hover:text-white'
            }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          Código
        </button>
      </div>
    </div>
  )
}
