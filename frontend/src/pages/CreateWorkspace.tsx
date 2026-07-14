import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Sparkles, FolderPlus, Globe, Code2, Layers, Cpu, Server } from 'lucide-react'

interface CreateWorkspaceProps {
  handleCreateWorkspace: (name: string, stack: string) => Promise<string | null>
}

const STACK_DETAILS = [
  {
    value: 'static',
    label: 'Site Estático (Nginx)',
    hint: 'HTML5, CSS3, Tailwind CSS & JS',
    description: 'Servido via servidor Nginx isolado e leve. Ideal para landing pages, portfólios e sites institucionais simples.',
    icon: Globe,
    color: 'from-blue-500 to-indigo-600',
    iconColor: 'text-blue-400',
  },
  {
    value: 'node',
    label: 'Node.js (Vite + React/TS)',
    hint: 'Aplicações Modernas Single Page (SPA)',
    description: 'Inicia um ambiente de compilação rápida com Vite, TypeScript e Hot Module Replacement (HMR) em tempo real.',
    icon: Code2,
    color: 'from-emerald-400 to-teal-600',
    iconColor: 'text-emerald-400',
  },
  {
    value: 'php',
    label: 'PHP Puro',
    hint: 'Scripting Dinâmico e Leve',
    description: 'Contêiner PHP embarcado para rodar scripts dinâmicos de backend sem a necessidade de frameworks robustos.',
    icon: Layers,
    color: 'from-violet-500 to-indigo-700',
    iconColor: 'text-violet-400',
  },
  {
    value: 'go',
    label: 'Go Language',
    hint: 'Servidores & APIs de Alta Performance',
    description: 'Ambiente Go com roteador net/http padrão estruturado para APIs nativas rápidas e de baixa latência.',
    icon: Cpu,
    color: 'from-sky-400 to-blue-600',
    iconColor: 'text-sky-400',
  },
  {
    value: 'python',
    label: 'Python (Flask)',
    hint: 'Aplicações Web & Microsserviços Python',
    description: 'Ideal para integrar scripts de IA e microsserviços simples usando a biblioteca Flask do ecossistema Python.',
    icon: Server,
    color: 'from-yellow-500 to-amber-600',
    iconColor: 'text-amber-400',
  },
]

export default function CreateWorkspace({ handleCreateWorkspace }: CreateWorkspaceProps) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [stack, setStack] = useState('static')
  const [slug, setSlug] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate live slug preview
  useEffect(() => {
    const generated = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
    setSlug(generated || 'projeto-exemplo')
  }, [name])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setCreating(true)
    setError(null)
    try {
      const newId = await handleCreateWorkspace(name, stack)
      if (newId) {
        navigate(`/workspace/${newId}`)
      } else {
        setError('Ocorreu um erro no servidor ao tentar criar o workspace.')
      }
    } catch (err: any) {
      setError(err?.message || 'Falha na conexão com o servidor backend.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex-grow overflow-y-auto w-full select-text py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2">
          <Link 
            to="/dashboard" 
            className="flex items-center gap-1.5 text-xs text-slate-450 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Voltar ao Painel
          </Link>
        </div>

        {/* Heading */}
        <div className="border-b border-slate-900 pb-6">
          <h2 className="text-3xl font-extrabold text-white flex items-center gap-2.5">
            <FolderPlus className="w-8 h-8 text-indigo-400" />
            Configurar Novo Workspace
          </h2>
          <p className="text-xs text-slate-400 mt-1.5">
            Crie um ambiente isolado com container Docker dedicado e scaffolds de stack autodetectáveis.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-455 text-xs rounded-xl p-4">
            {error}
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Panel: Inputs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/35 border border-slate-900 rounded-2xl p-6 space-y-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Informações Principais</h3>
              
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome do Projeto</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: E-Commerce, Blog Pessoal"
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">URL Amigável (Slug)</label>
                <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 text-xs font-mono text-slate-400 truncate">
                  {slug}.localhost:8000
                </div>
                <p className="text-[10px] text-slate-550 leading-relaxed">
                  Gerado automaticamente a partir do nome do projeto para acesso via subdomínio ou caminho amigável.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-900">
                <button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Processando...' : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Inicializar Workspace
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Stack selection */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Selecione a Stack do Workspace</h3>
            <div className="space-y-3.5">
              {STACK_DETAILS.map((opt) => {
                const IconComponent = opt.icon
                const isSelected = stack === opt.value
                return (
                  <div
                    key={opt.value}
                    onClick={() => setStack(opt.value)}
                    className={`border transition-all rounded-2xl p-5 cursor-pointer flex gap-4 items-start ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/[0.03] shadow-lg shadow-indigo-500/[0.02]'
                        : 'border-slate-900 bg-slate-900/25 hover:border-slate-800 hover:bg-slate-900/40'
                    }`}
                  >
                    <div className={`h-11 w-11 rounded-xl bg-gradient-to-tr ${opt.color} flex items-center justify-center text-white shrink-0`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-grow">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-200 text-sm">{opt.label}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{opt.hint}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {opt.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </form>
      </div>
    </div>
  )
}
