import { Link } from 'react-router-dom'
import { Sparkles, Database, Info } from 'lucide-react'

export default function About() {
  return (
    <div className="flex-grow max-w-4xl mx-auto px-6 py-16 space-y-12">
      <div className="space-y-4">
        <h2 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <Info className="w-8 h-8 text-indigo-400" /> Sobre o Crom Nextline
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          O Crom Nextline Editor AI nasceu da necessidade de empoderar desenvolvedores e designers a prototipar e lançar projetos web em velocidade recorde utilizando Inteligência Artificial local e contêineres Docker isolados.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-900 pt-10">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-indigo-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> Inteligência Soberana
          </h3>
          <p className="text-xs text-slate-455 leading-relaxed">
            Ao contrário de editores web tradicionais que expõem os dados do seu código para provedores SaaS centralizados, o Crom utiliza o ecossistema local do <strong>Crom Agente</strong>. Isso garante privacidade absoluta e controle total sobre seu ambiente.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-purple-400 flex items-center gap-1.5">
            <Database className="w-4 h-4" /> Infraestrutura Multi-Tenant
          </h3>
          <p className="text-xs text-slate-455 leading-relaxed">
            O backend Laravel gerencia o mapeamento físico e lógico do Docker Socket host (`docker.sock`). Ao criar um novo projeto, a plataforma aloca uma porta dinâmica e inicializa um servidor web Nginx autônomo, fornecendo acesso exclusivo de preview para o cliente.
          </p>
        </div>
      </div>

      <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-xl space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">A Stack Tecnológica</h3>
        <ul className="text-xs text-slate-400 space-y-2">
          <li><strong>Frontend:</strong> React, TypeScript, Tailwind CSS v4, Lucide React e React Router.</li>
          <li><strong>Backend:</strong> Laravel 11 estruturado puramente como API Gateway de microsserviços.</li>
          <li><strong>CLI Bridge:</strong> Go Module (`crom-cli`) usando o pacote Gorilla WebSocket para comunicação com o Daemon local.</li>
          <li><strong>Contêineres:</strong> Docker Compose, Dockerfiles otimizados e Nginx Alpine de provisionamento rápido.</li>
        </ul>
      </div>

      <div className="flex justify-center pt-6">
        <Link 
          to="/login" 
          className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-600 font-bold rounded-lg text-xs text-white"
        >
          Iniciar Protótipo
        </Link>
      </div>
    </div>
  )
}
