import { useState, useEffect } from 'react'
import { 
  Key, 
  Users, 
  Plus, 
  Settings, 
  CheckCircle2, 
  AlertTriangle,
  Activity
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

const API_BASE = 'http://localhost:8000/api'

export default function AdminDashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [apiKey, setApiKey] = useState('')
  const [costPerReq, setCostPerReq] = useState('10')
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

  // Handle settings update
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openrouter_api_key: apiKey,
          points_cost_per_request: parseInt(costPerReq) || 10
        })
      })
      const data = await response.json()
      if (data.status === 'success') {
        showFeedback('success', 'Configurações atualizadas no banco de dados!')
      } else {
        showFeedback('error', data.message)
      }
    } catch (err) {
      showFeedback('error', 'Erro ao atualizar configurações.')
    } finally {
      setIsLoading(false)
    }
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
        showFeedback('success', `Adicionados ${pointsAmount} pontos para o cliente com sucesso!`)
        // Clear input for this client
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
    <div className="flex-grow overflow-y-auto max-w-6xl w-full mx-auto px-6 py-10 space-y-8 select-text">
      
      {/* Header and Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-400" /> Painel de Controle Administrativo
          </h2>
          <p className="text-xs text-slate-400 mt-1">Configure o ecossistema Crom, chaves OpenRouter e gerencie créditos de clientes.</p>
        </div>
        
        <button 
          onClick={loadAdminData}
          disabled={isLoading}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold rounded-lg text-slate-300 transition-colors shrink-0 disabled:opacity-50"
        >
          Sincronizar Dados
        </button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`fixed top-20 right-6 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-2 text-xs font-bold animate-bounce ${
          feedback.type === 'success' ? 'bg-emerald-950 border-emerald-500 text-emerald-400' : 'bg-rose-950 border-rose-500 text-rose-455'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {feedback.text}
        </div>
      )}

      {/* Grid: Settings Form & Overview metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Settings Configuration Card */}
        <div className="lg:col-span-2 bg-slate-900/35 border border-slate-900 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-2">
            <Key className="w-4 h-4 text-indigo-400" /> Configurações Gerais da API
          </h3>
          
          <form onSubmit={handleUpdateSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">OpenRouter API Key</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded px-3 py-2 text-xs text-white outline-none transition-colors font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Configuração de nuvem para fallback/uso do daemon do Crom Agente.</span>
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
              <span className="text-[10px] text-slate-500 mt-1 block">Quantidade de pontos debitada do saldo do cliente por alteração solicitada.</span>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="py-2 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Salvar Alterações
            </button>
          </form>
        </div>

        {/* Dynamic Containers Status Widget */}
        <div className="bg-slate-900/35 border border-slate-900 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-2">
            <Activity className="w-4 h-4 text-purple-400" /> Monitor Docker
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Total de Workspaces:</span>
              <span className="font-bold text-slate-200">{workspaces.length}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Ativos (ON):</span>
              <span className="font-bold text-emerald-400">{workspaces.filter(w => w.status === 'running').length}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Inativos (OFF):</span>
              <span className="font-bold text-slate-500">{workspaces.filter(w => w.status === 'stopped').length}</span>
            </div>
          </div>

          <div className="border-t border-slate-850 pt-3 space-y-2 max-h-[140px] overflow-y-auto">
            {workspaces.map(w => (
              <div key={w.id} className="flex justify-between items-center bg-slate-950/40 p-2 rounded border border-slate-900 text-[10px] font-mono">
                <span className="truncate max-w-[120px]">{w.name}</span>
                <span className={`px-1 rounded ${w.status === 'running' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                  Porta {w.port}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Client List and Point Granter */}
      <div className="bg-slate-900/35 border border-slate-900 p-6 rounded-2xl space-y-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-850 pb-2">
          <Users className="w-4 h-4 text-pink-400" /> Clientes Cadastrados
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-350">
            <thead className="text-[10px] uppercase font-bold text-slate-450 border-b border-slate-900 bg-slate-950/20">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">E-mail / ID</th>
                <th className="px-4 py-3 text-center">Pontos Atuais</th>
                <th className="px-4 py-3 text-right">Crédito de Pontos</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-slate-500">Nenhum cliente cadastrado no banco de dados.</td>
                </tr>
              ) : (
                clients.map(client => (
                  <tr key={client.id} className="border-b border-slate-900 hover:bg-slate-900/20 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-200">{client.name}</td>
                    <td className="px-4 py-3.5 font-mono text-[10px]">
                      <div>{client.email}</div>
                      <div className="text-slate-500">{client.id}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-indigo-400 text-sm">
                      {client.points} pts
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex gap-1.5 justify-end items-center">
                        <input 
                          type="number"
                          value={pointsInput[client.id] || ''}
                          onChange={(e) => setPointsInput(prev => ({ ...prev, [client.id]: e.target.value }))}
                          placeholder="Ex: 200"
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

    </div>
  )
}
