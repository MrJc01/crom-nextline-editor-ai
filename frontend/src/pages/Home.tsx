import { Link } from 'react-router-dom'
import { Sparkles, Cpu, Database, Terminal, ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex-grow flex flex-col items-center justify-start px-6 py-20 relative overflow-y-auto w-full h-full">
      {/* Dynamic backdrop glows */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] rounded-full bg-purple-600/5 blur-3xl -z-10 animate-pulse"></div>

      <div className="text-center max-w-3xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-450 text-xs font-bold shadow-sm shadow-indigo-500/5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
          Construção e Edição de Sites Profissionais com IA
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-none">
          Crom Nextline <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Editor de Sites Inteligente
          </span>
        </h1>

        <p className="max-w-xl mx-auto text-slate-450 text-base md:text-lg leading-relaxed">
          Edite layouts e crie sistemas completos escrevendo no chat. Cada projeto roda isolado em contêineres Docker exclusivos com suporte a múltiplos runtimes e preview instantâneo.
        </p>

        <div className="flex justify-center gap-4 pt-4">
          <Link 
            to="/login" 
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 text-white"
          >
            Acessar Painel <ArrowRight className="w-4 h-4" />
          </Link>
          <Link 
            to="/sobre" 
            className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-750 font-bold rounded-xl transition-colors text-slate-300"
          >
            Conhecer Projeto
          </Link>
        </div>
      </div>

      {/* Hero image preview */}
      <div className="w-full max-w-4xl mx-auto mt-14 px-4 relative group">
        <div className="absolute inset-0 bg-indigo-500/5 rounded-2xl blur-3xl -z-10 group-hover:bg-indigo-500/10 transition-colors"></div>
        <div className="bg-slate-900/40 border border-slate-800 p-2 rounded-2xl backdrop-blur-md shadow-2xl overflow-hidden">
          <img 
            src="/landing-preview.png" 
            alt="Painel Crom Nextline Editor" 
            className="w-full h-auto rounded-xl border border-slate-950"
          />
        </div>
      </div>

      {/* Feature cards Grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 px-4">
        <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-xl backdrop-blur-sm space-y-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-sm">Runtimes Dinâmicos</h3>
          <p className="text-xs text-slate-455 leading-relaxed">Detecção automática e execução em tempo real de stacks modernas como Node.js (Vite, Next.js), Laravel, Python, Go e HTML estático.</p>
        </div>
        <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-xl backdrop-blur-sm space-y-3">
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-sm">Segurança de Sandbox</h3>
          <p className="text-xs text-slate-455 leading-relaxed">Ambiente blindado contra invasões, com controle de recursos (RAM/CPU), proteção de Path Traversal e validado por 55+ pentests automatizados.</p>
        </div>
        <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-xl backdrop-blur-sm space-y-3">
          <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
            <Terminal className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-sm">Histórico Multithread</h3>
          <p className="text-xs text-slate-455 leading-relaxed">Painel de chat completo com múltiplas threads de conversa, histórico persistente, filtros de busca em tempo real e controle de créditos.</p>
        </div>
      </div>
    </div>
  )
}
