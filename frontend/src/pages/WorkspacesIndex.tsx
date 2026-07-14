import { Link } from 'react-router-dom'
import { Plus, Play, Square, Folder, ExternalLink, ArrowRight, Layers } from 'lucide-react'
import type { Workspace } from '../types'

interface WorkspacesIndexProps {
  workspaces: Workspace[]
  handleStartDocker: (wsId: string) => void
  handleStopDocker: (wsId: string) => void
}

export default function WorkspacesIndex({
  workspaces,
  handleStartDocker,
  handleStopDocker
}: WorkspacesIndexProps) {

  // Modal removed in favor of dedicated creation page.

  return (
    <div className="flex-grow overflow-y-auto max-w-6xl w-full mx-auto px-6 py-12 space-y-8 select-text">
      
      {/* Welcome & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Folder className="w-6 h-6 text-indigo-400" /> Seus Projetos Web
          </h2>
          <p className="text-xs text-slate-400 mt-1">Gerencie workspaces isolados e edite layouts de páginas com inteligência artificial local.</p>
        </div>
        
        <Link 
          to="/workspace/create"
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer select-none"
        >
          <Plus className="w-4 h-4" /> Novo Projeto
        </Link>
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card: New Workspace CTA */}
        <Link 
          to="/workspace/create"
          className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all min-h-[180px] select-none"
        >
          <div className="h-10 w-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200 block">Adicionar Workspace</span>
            <span className="text-[10px] text-slate-500 mt-1 block">Criar nova estrutura de arquivos e contêiner</span>
          </div>
        </Link>

        {/* Dynamic Workspace Cards */}
        {workspaces.map(ws => (
          <div 
            key={ws.id}
            className="bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-2xl p-6 flex flex-col justify-between gap-4 transition-all"
          >
            {/* Header info */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-white text-sm truncate max-w-[170px]">{ws.name}</h3>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 border ${
                  ws.status === 'running' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : ws.status === 'starting' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : ws.status === 'error' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-slate-800 text-slate-450 border-slate-755'
                }`}>
                  {ws.status === 'running' ? 'Servidor ON'
                    : ws.status === 'starting' ? 'Subindo'
                    : ws.status === 'error' ? 'Erro'
                    : 'Servidor OFF'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono truncate">{ws.id}</p>
            </div>

            {/* Docker specs */}
            <div className="flex justify-between items-center bg-slate-950/40 border border-slate-900 p-2.5 rounded-lg text-[10px] font-mono">
              <span className="text-slate-450">Porta: {ws.port}</span>
              <div className="flex items-center gap-2">
                {ws.status === 'stopped' ? (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartDocker(ws.id);
                    }}
                    className="p-1 rounded bg-slate-800 hover:bg-emerald-600/20 hover:text-emerald-400 text-slate-400 transition-all cursor-pointer flex items-center gap-1"
                    title="Iniciar Nginx"
                  >
                    <Play className="w-2.5 h-2.5" /> <span className="text-[9px]">Ligar</span>
                  </button>
                ) : (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStopDocker(ws.id);
                    }}
                    className="p-1 rounded bg-slate-800 hover:bg-rose-600/20 hover:text-rose-450 text-slate-400 transition-all cursor-pointer flex items-center gap-1"
                    title="Parar Nginx"
                  >
                    <Square className="w-2.5 h-2.5" /> <span className="text-[9px]">Desligar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between border-t border-slate-900/60 pt-4">
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {ws.framework ? `${ws.stack}·${ws.framework}` : (ws.stack || 'estático')}
              </span>

              <div className="flex gap-2">
                {ws.status === 'running' && (
                  <a 
                    href={`http://localhost:${ws.port}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                    title="Abrir Preview em Nova Aba"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                
                <Link 
                  to={`/workspace/${ws.id}`}
                  className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-600 hover:text-white font-bold rounded-lg text-[10px] text-white flex items-center gap-1 transition-all"
                >
                  Editar <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}
