import { useState, useEffect } from 'react'
import { 
  Key, 
  Users, 
  Plus, 
  Settings, 
  CheckCircle2, 
  AlertTriangle,
  Activity,
  Cpu,
  Check
} from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string
  points: number
  created_at: string
}

interface Workspace {
  id: string
  name: string
  port: number
  status: 'running' | 'stopped'
  path: string
}

interface AIModel {
  id: string
  name: string
  provider: string
}

const API_BASE = 'http://localhost:8000/api'

// Predefined OpenRouter models list
const AVAILABLE_MODELS: AIModel[] = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek' }
]

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'settings' | 'models' | 'clients' | 'docker'>('settings')
  
  const [clients, setClients] = useState<Client[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [apiKey, setApiKey] = useState('')
  const [costPerReq, setCostPerReq] = useState('10')
  const [allowedModels, setAllowedModels] = useState<string[]>([
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o'
  ])
  const [defaultModel, setDefaultModel] = useState('anthropic/claude-3.5-sonnet')
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Points input states keyed by client id
  const [pointsInput, setPointsInput] = useState<{ [clientId: string]: string }>({})

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text })
    setTimeout(() => setFeedback(null), 3000)
  }

  // Load clients, settings, workspaces
  const loadAdminData = async () => {
    setIsLoading(true)
    try {
      // 1. Fetch settings
      const settingsRes = await fetch(`${API_BASE}/settings`)
      const settingsData = await settingsRes.json()
      if (settingsData.status === 'success') {
        setApiKey(settingsData.settings.openrouter_api_key || '')
        setCostPerReq(settingsData.settings.points_cost_per_request || '10')
        
        // Parse allowed models JSON if present
        if (settingsData.settings.allowed_models) {
          try {
            setAllowedModels(JSON.parse(settingsData.settings.allowed_models))
          } catch(e) {}
        }
        if (settingsData.settings.default_model) {
          setDefaultModel(settingsData.settings.default_model)
        }
      }

      // 2. Fetch clients
      const clientsRes = await fetch(`${API_BASE}/clients`)
      const clientsData = await clientsRes.json()
      if (clientsData.status === 'success') {
        setClients(clientsData.clients)
      }

      // 3. Fetch workspaces
      const workspacesRes = await fetch(`${API_BASE}/workspaces`)
      const workspacesData = await workspacesRes.json()
      if (workspacesData.status === 'success') {
        setWorkspaces(workspacesData.workspaces)
      }
    } catch (err) {
      showFeedback('error', 'Falha ao se conectar com a API backend.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  // Handle settings/models update
  const saveConfiguration = async (updatedFields: object) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openrouter_api_key: apiKey,
          points_cost_per_request: parseInt(costPerReq) || 10,
          allowed_models: JSON.stringify(allowedModels),
          default_model: defaultModel,
          ...updatedFields
        })
      })
      const data = await response.json()
      if (data.status === 'success') {
        showFeedback('success', 'Configurações atualizadas!')
        await loadAdminData()
      } else {
        showFeedback('error', data.message)
      }
    } catch (err) {
      showFeedback('error', 'Erro ao salvar configurações.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle toggle allowed model
  const handleToggleModel = (modelId: string) => {
    const updated = allowedModels.includes(modelId)
      ? allowedModels.filter(id => id !== modelId)
      : [...allowedModels, modelId]
    setAllowedModels(updated)
  }

  // Handle granting points to client
  const handleGrantPoints = async (clientId: string) => {
    const pointsStr = pointsInput[clientId]
    const pointsAmount = parseInt(pointsStr)
    if (isNaN(pointsAmount) || pointsAmount <= 0) {
      alert('Por favor insira um valor válido de pontos maior que 0!')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/clients/${clientId}/points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: pointsAmount })
      })
      const data = await response.json()
      if (data.status === 'success') {
        showFeedback('success', `Adicionados ${pointsAmount} pontos com sucesso!`)
        setPointsInput(prev => ({ ...prev, [clientId]: '' }))
        await loadAdminData()
      } else {
        showFeedback('error', data.message)
      }
    } catch (err) {
      showFeedback('error', 'Erro ao creditar pontos.')
    }
  }

  return (
    <div className="flex-grow flex bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* Feedback Toast */}
      {feedback && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-2 text-xs font-bold animate-bounce ${
          feedback.type === 'success' ? 'bg-emerald-950 border-emerald-500 text-emerald-400' : 'bg-rose-950 border-rose-500 text-rose-455'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {feedback.text}
        </div>
      )}

      {/* Internal Admin Sidebar Menu */}
      <div className="w-64 border-r border-slate-900 bg-slate-950/60 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-900 shrink-0">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-400" /> Painel Admin
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Configurações do Sistema</p>
        </div>

        <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 ${
              activeTab === 'settings' 
                ? 'bg-indigo-600/15 border border-indigo-500 text-white' 
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Key className="w-4 h-4" /> Configurações Gerais
          </button>

          <button
            onClick={() => setActiveTab('models')}
            className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 ${
              activeTab === 'models' 
                ? 'bg-indigo-600/15 border border-indigo-500 text-white' 
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Cpu className="w-4 h-4" /> Modelos de IA
          </button>

          <button
            onClick={() => setActiveTab('clients')}
            className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 ${
              activeTab === 'clients' 
                ? 'bg-indigo-600/15 border border-indigo-500 text-white' 
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Users className="w-4 h-4" /> Clientes & Crédito
          </button>

          <button
            onClick={() => setActiveTab('docker')}
            className={`w-full text-left px-4 py-3 rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 ${
              activeTab === 'docker' 
                ? 'bg-indigo-600/15 border border-indigo-500 text-white' 
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Activity className="w-4 h-4" /> Monitor Docker
          </button>
        </nav>

        <div className="p-4 border-t border-slate-900 text-center shrink-0">
          <button 
            onClick={loadAdminData}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-[10px] font-bold rounded border border-slate-850 text-slate-400"
          >
            Sincronizar Banco
          </button>
        </div>
      </div>

      {/* Admin Content Window */}
      <div className="flex-grow p-8 overflow-y-auto max-w-4xl select-text">
        
        {/* VIEW 1: GENERAL SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Configurações Gerais</h2>
              <p className="text-xs text-slate-500 mt-1">Configure chaves e custos operacionais da plataforma.</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); saveConfiguration({}); }} className="space-y-6 bg-slate-900/30 border border-slate-900 p-6 rounded-2xl">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">OpenRouter API Key</label>
                  <input 
                    type="password" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded px-3 py-2 text-xs text-white outline-none transition-colors font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1.5 block">Alimente esta chave para viabilizar as chamadas de fallbacks locais da orquestração Go.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Custo de Pontos por Uso</label>
                  <input 
                    type="number" 
                    value={costPerReq}
                    onChange={(e) => setCostPerReq(e.target.value)}
                    min="0"
                    className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded px-3 py-2 text-xs text-white outline-none transition-colors"
                  />
                  <span className="text-[10px] text-slate-500 mt-1.5 block">Valor cobrado do saldo do cliente por cada iteração/prompt no chat de comandos.</span>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="py-2 px-6 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Salvar Alterações
              </button>
            </form>
          </div>
        )}

        {/* VIEW 2: AI MODELS CONFIG */}
        {activeTab === 'models' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Modelos de IA Disponíveis</h2>
              <p className="text-xs text-slate-500 mt-1">Habilite/desabilite modelos de orquestração de código e defina o modelo padrão do sistema.</p>
            </div>

            <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-6">
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Tabela de Modelos (OpenRouter)</span>
                
                {AVAILABLE_MODELS.map(model => (
                  <div 
                    key={model.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-900 hover:border-slate-800 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        checked={allowedModels.includes(model.id)}
                        onChange={() => handleToggleModel(model.id)}
                        className="rounded border-slate-800 text-indigo-650 focus:ring-indigo-500 w-4 h-4 bg-slate-950 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">{model.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{model.id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded">
                        {model.provider}
                      </span>
                      
                      {allowedModels.includes(model.id) && (
                        <button
                          onClick={() => setDefaultModel(model.id)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            defaultModel === model.id 
                              ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 flex items-center gap-1' 
                              : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400'
                          }`}
                        >
                          {defaultModel === model.id ? (
                            <>
                              <Check className="w-3 h-3" /> Padrão
                            </>
                          ) : 'Definir Padrão'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-900">
                <button
                  onClick={() => saveConfiguration({})}
                  disabled={isLoading}
                  className="py-2 px-6 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Salvar Modelos Ativos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: CLIENTS AND POINTS */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Clientes & Gestão de Crédito</h2>
              <p className="text-xs text-slate-500 mt-1">Monitore saldos e conceda pontos adicionais aos usuários do sistema.</p>
            </div>

            <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left text-slate-350">
                <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-900 bg-slate-950/20">
                  <tr>
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3">E-mail / ID</th>
                    <th className="px-6 py-3 text-center">Pontos Atuais</th>
                    <th className="px-6 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-slate-500">Nenhum cliente cadastrado.</td>
                    </tr>
                  ) : (
                    clients.map(client => (
                      <tr key={client.id} className="border-b border-slate-900 hover:bg-slate-900/20 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-200">{client.name}</td>
                        <td className="px-6 py-4 font-mono text-[10px]">
                          <div>{client.email}</div>
                          <div className="text-slate-600">{client.id}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-indigo-400 text-sm">
                          {client.points} pts
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex gap-1.5 justify-end items-center">
                            <input 
                              type="number"
                              value={pointsInput[client.id] || ''}
                              onChange={(e) => setPointsInput(prev => ({ ...prev, [client.id]: e.target.value }))}
                              placeholder="Ex: 500"
                              className="w-20 bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded px-2.5 py-1 text-xs text-white outline-none"
                            />
                            <button
                              onClick={() => handleGrantPoints(client.id)}
                              className="px-3 py-1 bg-indigo-650 hover:bg-indigo-600 font-bold rounded-lg text-[10px] text-white flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Plus className="w-3 h-3" /> Creditar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 4: DOCKER MONITOR */}
        {activeTab === 'docker' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Monitor de Contêineres Docker</h2>
              <p className="text-xs text-slate-500 mt-1">Estatísticas de orquestração de servidores web Nginx para os previews dos clientes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/35 border border-slate-900 p-5 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Portas Alocadas</span>
                <span className="text-2xl font-extrabold text-white">{workspaces.length}</span>
              </div>
              <div className="bg-slate-900/35 border border-slate-900 p-5 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contêineres Ativos (ON)</span>
                <span className="text-2xl font-extrabold text-emerald-400">
                  {workspaces.filter(w => w.status === 'running').length}
                </span>
              </div>
              <div className="bg-slate-900/35 border border-slate-900 p-5 rounded-xl text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Inativos (OFF)</span>
                <span className="text-2xl font-extrabold text-slate-500">
                  {workspaces.filter(w => w.status === 'stopped').length}
                </span>
              </div>
            </div>

            <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Estrutura de Workspaces Dinâmicos</span>
              
              {workspaces.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Nenhum workspace ativo no banco de dados.</p>
              ) : (
                workspaces.map(w => (
                  <div key={w.id} className="flex justify-between items-center bg-slate-950/60 p-3 rounded-lg border border-slate-900 text-xs font-mono">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-slate-200">{w.name}</span>
                      <span className="text-[10px] text-slate-550 truncate max-w-[300px]">{w.path}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400">Porta: {w.port}</span>
                      <span className={`px-2 py-0.5 rounded-[4px] font-bold uppercase text-[9px] ${
                        w.status === 'running' ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' : 'bg-slate-900 text-slate-500'
                      }`}>
                        {w.status === 'running' ? 'Active' : 'Offline'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  )
}
