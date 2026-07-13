import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Info, Layout, LogOut, Lock, Sparkles } from 'lucide-react'

interface LayoutWrapperProps {
  children: React.ReactNode
  isAuthenticated: boolean
  handleLogout: () => void
  agentStatus: string
}

export default function LayoutWrapper({ children, isAuthenticated, handleLogout, agentStatus }: LayoutWrapperProps) {
  const location = useLocation()
  
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Navbar */}
      <header className="flex items-center justify-between border-b border-slate-900 bg-slate-900/40 backdrop-blur-md px-6 py-4 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
            C
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              Crom Nextline <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono">v1.2.0</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated && (
            <div className="text-xs flex items-center gap-2 font-mono">
              {agentStatus === 'idle' && (
                <span className="text-slate-400 flex items-center gap-1.5 bg-slate-800/40 px-2.5 py-0.5 rounded border border-slate-800">
                  <span className="w-1 h-1 rounded-full bg-slate-500"></span> IDLE
                </span>
              )}
              {agentStatus === 'analyzing' && (
                <span className="text-yellow-400 flex items-center gap-1.5 bg-yellow-500/10 px-2.5 py-0.5 rounded border border-yellow-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span> ANALISANDO
                </span>
              )}
              {agentStatus === 'running_go' && (
                <span className="text-cyan-400 flex items-center gap-1.5 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span> GO CLI RUNNING
                </span>
              )}
              {agentStatus === 'writing_files' && (
                <span className="text-purple-400 flex items-center gap-1.5 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span> WRITING
                </span>
              )}
              {agentStatus === 'done' && (
                <span className="text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> SYNCED
                </span>
              )}
            </div>
          )}

          {/* Friendly Route Navigation Links */}
          <nav className="flex items-center gap-6 text-xs font-semibold">
            <Link 
              to="/" 
              className={`flex items-center gap-1.5 transition-colors ${location.pathname === '/' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
            >
              <Home className="w-3.5 h-3.5" /> Home
            </Link>
            <Link 
              to="/sobre" 
              className={`flex items-center gap-1.5 transition-colors ${location.pathname === '/sobre' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
            >
              <Info className="w-3.5 h-3.5" /> Sobre
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link 
                  to="/dashboard" 
                  className={`flex items-center gap-1.5 transition-colors ${location.pathname === '/dashboard' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
                >
                  <Layout className="w-3.5 h-3.5" /> Painel Editor
                </Link>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer bg-transparent border-none outline-none font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sair
                </button>
              </>
            ) : (
              <Link 
                to="/login" 
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-650 hover:bg-indigo-600 text-white transition-all shadow-md shadow-indigo-600/10 ${
                  location.pathname === '/login' ? 'ring-2 ring-indigo-500' : ''
                }`}
              >
                <Lock className="w-3.5 h-3.5" /> Entrar
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
