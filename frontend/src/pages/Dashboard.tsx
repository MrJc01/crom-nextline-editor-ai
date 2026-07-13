import React from 'react'
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
  Plus,
  Play,
  Square,
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

interface DashboardProps {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  messages: Message[]
  inputText: string
  setInputText: (val: string) => void
  isProcessing: boolean
  previewMode: 'desktop' | 'tablet' | 'mobile'
  setPreviewMode: (val: 'desktop' | 'tablet' | 'mobile') => void
  activeTab: 'preview' | 'code' | 'logs'
  setActiveTab: (val: 'preview' | 'code' | 'logs') => void
  files: { [key: string]: string }
  selectedFile: string
  setSelectedFile: (val: string) => void
  isCreateModalOpen: boolean
  setIsCreateModalOpen: (val: boolean) => void
  newWorkspaceName: string
  setNewWorkspaceName: (val: string) => void
  terminalLogs: any[]
  setTerminalLogs: (val: any) => void
  handleSelectWorkspace: (ws: Workspace) => void
  handleCreateWorkspace: (e: React.FormEvent) => void
  handleStartDocker: (wsId: string) => void
  handleStopDocker: (wsId: string) => void
  handleSendMessage: (text: string) => void
  handleResetWorkspace: () => void
  getIframeSrc: () => string
}

export default function Dashboard({ 
  workspaces, 
  activeWorkspace, 
  messages, 
  inputText, 
  setInputText, 
  isProcessing, 
  previewMode, 
  setPreviewMode, 
  activeTab, 
  setActiveTab, 
  files, 
  selectedFile, 
  setSelectedFile, 
  isCreateModalOpen, 
  setIsCreateModalOpen, 
  newWorkspaceName, 
  setNewWorkspaceName, 
  terminalLogs, 
  setTerminalLogs, 
  handleSelectWorkspace, 
  handleCreateWorkspace, 
  handleStartDocker, 
  handleStopDocker, 
  handleSendMessage, 
  handleResetWorkspace, 
  getIframeSrc 
}: DashboardProps) {
  
  return (
    <div className="flex flex-grow w-full overflow-hidden">
      
      {/* Leftmost Sidebar: Workspaces / Project List */}
      <div className="w-64 border-r border-slate-900 bg-slate-950/40 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-900 flex items-center justify-between shrink-0">
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
            workspaces.map((ws: Workspace) => (
              <div 
                key={ws.id}
                onClick={() => handleSelectWorkspace(ws)}
                className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-2 ${
                  activeWorkspace?.id === ws.id 
                    ? 'bg-indigo-600/15 border-indigo-550 text-white shadow-md shadow-indigo-600/5' 
                    : 'bg-slate-900/40 border-slate-900 hover:bg-slate-800/40 text-slate-350'
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
                  <span className="text-[10px] font-mono text-slate-450">Porta: {ws.port}</span>
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

        <div className="p-3 bg-slate-950/60 border-t border-slate-900 text-[10px] text-slate-500 text-center shrink-0">
          Conexão com o Docker Socket ativa
        </div>
      </div>

      {/* Center Panel: Chat Control and Logs */}
      <div className="w-[420px] md:w-[450px] shrink-0 border-r border-slate-900 flex flex-col bg-slate-900/40 relative">
        
        {/* Tabs header */}
        <div className="flex border-b border-slate-900 bg-slate-950/20 text-xs shrink-0">
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
              {messages.map((msg: Message) => (
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
                  <span className="text-[10px] text-slate-550 mt-1 px-1">
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
            </div>

            {/* Suggestions Panel */}
            {activeWorkspace && (
              <div className="px-4 py-2 bg-slate-900/30 border-t border-slate-900 shrink-0">
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
            <div className="p-4 border-t border-slate-900 bg-slate-900 shrink-0">
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
                  disabled={isProcessing || !activeWorkspace}
                  placeholder={activeWorkspace ? "Pedir alteração (ex: 'Adicionar seção de contato')..." : "Selecione um projeto primeiro..."}
                  className="flex-grow bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isProcessing || !activeWorkspace}
                  className="h-8 w-8 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors disabled:bg-slate-800 disabled:text-slate-650 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-550 px-1">
                <span>Modificações enviadas ao Laravel local</span>
                <span>vias de CLI Go</span>
              </div>
            </div>
          </>
        )}

        {/* TAB CONTENT: CODE EXPLORER */}
        {activeTab === 'code' && (
          <div className="flex-grow flex flex-col overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-950/40 border-b border-slate-900 text-xs text-slate-400 shrink-0">
              <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
              <span>Explorador de Arquivos Modificados</span>
            </div>

            <div className="flex bg-slate-950/20 border-b border-slate-900 px-2 py-1 text-xs shrink-0">
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

            <div className="flex-grow overflow-auto p-4 bg-slate-950/90 font-mono text-xs text-slate-300 leading-relaxed relative">
              <div className="absolute top-2 right-2 text-[10px] text-indigo-400/60 bg-indigo-500/5 px-2 py-0.5 border border-indigo-500/10 rounded">
                Somente Leitura (Editado por IA)
              </div>
              <pre className="whitespace-pre">{files[selectedFile]}</pre>
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-900 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
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
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-900 text-xs shrink-0">
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

            <div className="flex-grow p-4 overflow-y-auto font-mono text-[11px] space-y-2 select-text">
              {terminalLogs.length === 0 ? (
                <p className="text-slate-650 italic">Nenhum log registrado ainda.</p>
              ) : (
                terminalLogs.map((log: any, idx: number) => (
                  <div key={idx} className="flex gap-2 items-start hover:bg-slate-900/50 p-0.5 rounded">
                    <span className="text-slate-650 shrink-0">[{log.timestamp}]</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 uppercase ${
                      log.source === 'laravel' ? 'bg-rose-500/10 text-rose-455 border border-rose-500/20' :
                      log.source === 'go' ? 'bg-cyan-500/10 text-cyan-455 border border-cyan-500/20' :
                      'bg-indigo-500/10 text-indigo-455 border border-indigo-500/20'
                    }`}>
                      {log.source}
                    </span>
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
            </div>
          </div>
        )}

      </div>

      {/* Right Side: Site Preview / Visual Canvas */}
      <div className="flex-grow flex flex-col bg-slate-950 overflow-hidden relative">
        
        {/* Iframe Control Bar */}
        <div className="flex items-center justify-between px-6 py-2 bg-slate-900/50 border-b border-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/70"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500/70"></span>
            <span className="w-3 h-3 rounded-full bg-green-500/70"></span>
            <div className="ml-4 h-6 px-3 rounded bg-slate-950/60 border border-slate-900 text-[10px] text-slate-400 font-mono flex items-center gap-1.5 w-64 md:w-80 select-all">
              {activeWorkspace ? (
                <span className="text-emerald-500">
                  {activeWorkspace.status === 'running' 
                    ? `http://localhost:${activeWorkspace.port}` 
                    : `Vite Preview (Offline)`}
                </span>
              ) : (
                <span className="text-slate-655">http://localhost/preview</span>
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
            
            {activeWorkspace && (
              <button 
                onClick={handleResetWorkspace}
                className="flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-350 font-bold border border-slate-700 rounded px-2.5 py-1 transition-colors cursor-pointer"
                title="Resetar Site para Padrão"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          {/* Screen Toggles */}
          <div className="flex items-center gap-1.5 bg-slate-950/50 p-1 rounded-md border border-slate-900">
            <button 
              onClick={() => setPreviewMode('desktop')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                previewMode === 'desktop' ? 'bg-indigo-650 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setPreviewMode('tablet')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                previewMode === 'tablet' ? 'bg-indigo-650 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setPreviewMode('mobile')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                previewMode === 'mobile' ? 'bg-indigo-650 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Iframe Viewport Container */}
        <div className="flex-grow flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25"></div>

          {activeWorkspace ? (
            <div 
              className={`bg-slate-950 border border-slate-900 shadow-2xl rounded-xl overflow-hidden transition-all duration-300 flex flex-col h-full z-10 ${
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
            <div className="z-10 text-center max-w-md p-8 bg-slate-900/50 border border-slate-900 rounded-xl backdrop-blur-sm">
              <FolderOpen className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
              <h3 className="font-bold text-white text-base">Nenhum projeto ativo</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Crie um novo projeto usando o botão <span className="text-indigo-400 font-bold">+</span> na barra lateral esquerda ou selecione um projeto existente.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* CREATE WORKSPACE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-900 rounded-xl p-6 w-full max-w-sm shadow-2xl">
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
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded px-3 py-2 text-sm text-white outline-none transition-colors"
                />
              </div>
              <div className="flex justify-end gap-2 text-xs font-semibold pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-355 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded transition-colors cursor-pointer"
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
