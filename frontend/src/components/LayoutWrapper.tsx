import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Info, Layout, LogOut, Lock, Sparkles, Settings, Coins, ShieldAlert, Menu, X } from 'lucide-react'

interface LayoutWrapperProps {
  children: React.ReactNode
  isAuthenticated: boolean
  userRole: 'admin' | 'client'
  handleLogout: () => void
  agentStatus: string
  clientPoints: number
}

export default function LayoutWrapper({ children, isAuthenticated, userRole, handleLogout, agentStatus, clientPoints }: LayoutWrapperProps) {
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
  
  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden relative">
      
      {/* Mobile Menu Toggle Button */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-30 md:hidden p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white shadow-md backdrop-blur-sm cursor-pointer"
          title="Abrir Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Backdrop overlay for mobile drawer */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sleek leftmost global sidebar navigation */}
      <aside className={`
        fixed md:static inset-y-0 left-0 w-20 border-r border-slate-900 bg-slate-950 flex flex-col justify-between items-center py-6 shrink-0 z-50
        transition-transform duration-300 md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Top Logo & Close Button */}
        <div className="flex flex-col items-center gap-1 w-full relative">
          {/* Close button inside sidebar on mobile */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="absolute -top-2 right-2 p-1 text-slate-500 hover:text-white md:hidden cursor-pointer"
            title="Fechar Menu"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-indigo-500/25">
            C
          </div>
          <span className="text-[9px] font-extrabold tracking-widest text-indigo-400 uppercase mt-1">CROM</span>
        </div>

        {/* Center Navigation Links */}
        <nav className="flex flex-col gap-5 items-center w-full">
          <Link 
            to="/" 
            title="Página Inicial"
            onClick={() => setIsSidebarOpen(false)}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              location.pathname === '/' 
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30' 
                : 'text-slate-500 hover:text-slate-355 hover:bg-slate-900'
            }`}
          >
            <Home className="w-4.5 h-4.5" />
            <span className="text-[8px] font-bold">Home</span>
          </Link>

          <Link 
            to="/sobre" 
            title="Sobre a Plataforma"
            onClick={() => setIsSidebarOpen(false)}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              location.pathname === '/sobre' 
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30' 
                : 'text-slate-500 hover:text-slate-355 hover:bg-slate-900'
            }`}
          >
            <Info className="w-4.5 h-4.5" />
            <span className="text-[8px] font-bold">Sobre</span>
          </Link>

          {isAuthenticated ? (
            <>
              <Link 
                to="/dashboard" 
                title="Painel Editor de Sites"
                onClick={() => setIsSidebarOpen(false)}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                  location.pathname === '/dashboard' 
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30' 
                    : 'text-slate-500 hover:text-slate-355 hover:bg-slate-900'
                }`}
              >
                <Layout className="w-4.5 h-4.5" />
                <span className="text-[8px] font-bold">Editor</span>
              </Link>

              <Link
                to="/configuracoes"
                title="Minhas Configurações"
                onClick={() => setIsSidebarOpen(false)}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                  location.pathname === '/configuracoes'
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-500 hover:text-slate-355 hover:bg-slate-900'
                }`}
              >
                <Settings className="w-4.5 h-4.5" />
                <span className="text-[8px] font-bold">Config</span>
              </Link>

              {userRole === 'admin' && (
                <Link
                  to="/admin"
                  title="Painel Administrativo"
                  onClick={() => setIsSidebarOpen(false)}
                  className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                    location.pathname === '/admin'
                      ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30'
                      : 'text-slate-500 hover:text-slate-355 hover:bg-slate-900'
                  }`}
                >
                  <ShieldAlert className="w-4.5 h-4.5" />
                  <span className="text-[8px] font-bold">Admin</span>
                </Link>
              )}
            </>
          ) : (
            <Link 
              to="/login" 
              title="Entrar"
              onClick={() => setIsSidebarOpen(false)}
              className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                location.pathname === '/login' 
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30' 
                  : 'text-slate-500 hover:text-slate-355 hover:bg-slate-900'
              }`}
            >
              <Lock className="w-4.5 h-4.5" />
              <span className="text-[8px] font-bold">Entrar</span>
            </Link>
          )}
        </nav>

        {/* Bottom Status & Actions */}
        <div className="flex flex-col items-center gap-4 w-full px-2">
          
          {isAuthenticated && (
            <>
              {/* Points badge */}
              <div 
                className="w-14 py-1.5 rounded-lg bg-indigo-500/5 border border-indigo-500/15 flex flex-col items-center justify-center text-indigo-400 font-bold font-mono text-[9px]"
                title="Seus Créditos Disponíveis"
              >
                <Coins className="w-3.5 h-3.5 mb-0.5 text-indigo-400" />
                <span>{clientPoints}p</span>
              </div>

              {/* Mini agent status dot */}
              <div className="flex items-center justify-center">
                {agentStatus === 'idle' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-650" title="Agente Ocioso (IDLE)"></span>
                )}
                {agentStatus === 'analyzing' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-ping" title="Analisando Código"></span>
                )}
                {agentStatus === 'running_go' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" title="Go CLI Executando"></span>
                )}
                {agentStatus === 'writing_files' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" title="Escrevendo no Disco"></span>
                )}
                {agentStatus === 'done' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex items-center justify-center" title="Sincronizado!">
                    <Sparkles className="w-1.5 h-1.5 text-white" />
                  </span>
                )}
              </div>

              {/* Logout */}
              <button 
                onClick={() => { handleLogout(); setIsSidebarOpen(false); }}
                title="Sair da Conta"
                className="w-12 h-12 rounded-xl flex items-center justify-center text-rose-550 hover:text-rose-455 hover:bg-slate-900 transition-colors cursor-pointer bg-transparent border-none outline-none"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </>
          )}

        </div>
      </aside>

      {/* Right Content Panel */}
      <div className="flex-grow flex flex-col overflow-hidden bg-slate-950">
        {/* On mobile, pad top slightly so content doesn't cover toggle menu button */}
        <div className="md:hidden h-14 w-full flex items-center justify-end px-6 shrink-0 border-b border-slate-900 bg-slate-950/40 select-none">
          {isAuthenticated && (
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-indigo-400 bg-indigo-950/20 border border-indigo-500/15 py-1 px-2.5 rounded-full">
              <Coins className="w-3.5 h-3.5" />
              <span>{clientPoints}p</span>
            </div>
          )}
        </div>
        <div className="flex-grow flex flex-col overflow-hidden">
          {children}
        </div>
      </div>

    </div>
  )
}
