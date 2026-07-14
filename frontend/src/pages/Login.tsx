import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Shield, User, AlertCircle } from 'lucide-react'
import { fetchWithAuth } from '../utils/api'

interface LoginProps {
  onLoginSuccess: (role: 'admin' | 'client', token: string) => void
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('admin@crom.run')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const submitLogin = async (eEmail: string, ePass: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetchWithAuth('/login', {
        method: 'POST',
        body: JSON.stringify({ email: eEmail, password: ePass }),
      })
      const data = await response.json()
      if (response.ok && data.status === 'success') {
        const role = data.user.role === 'admin' ? 'admin' : 'client'
        onLoginSuccess(role, data.access_token)
        navigate(role === 'admin' ? '/admin' : '/dashboard')
      } else {
        setError(data.message || (data.errors && Object.values(data.errors).flat().join(' ')) || 'Falha na autenticação.')
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email && password) {
      submitLogin(email, password)
    }
  }

  return (
    <div className="flex-grow flex items-center justify-center px-6 py-20 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/3 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl -z-10"></div>

      <div className="bg-slate-900/60 border border-slate-800/80 p-8 rounded-2xl shadow-2xl w-full max-w-sm backdrop-blur-md">
        <div className="flex flex-col items-center mb-6">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-indigo-500/20 mb-3">
            C
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Login</h2>
          <p className="text-xs text-slate-400 mt-1">Acesse seus projetos ou o painel administrativo</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-200 rounded-lg text-xs flex items-center gap-2 animate-pulse">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-3 py-2 text-sm text-white outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-3 py-2 text-sm text-white outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold rounded-lg text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5 cursor-pointer mt-6"
          >
            <Lock className="w-3.5 h-3.5" />
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Presets de demonstração */}
        <div className="mt-6 pt-4 border-t border-slate-800/70">
          <p className="text-[10px] text-slate-500 text-center mb-2 uppercase tracking-wide font-bold">Entrar rápido (demo)</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => submitLogin('admin@crom.run', 'password')}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/25 text-xs font-bold transition-colors cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" /> Admin
            </button>
            <button
              onClick={() => submitLogin('client@crom.run', 'password')}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <User className="w-3.5 h-3.5" /> Cliente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
