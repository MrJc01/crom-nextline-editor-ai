import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'

interface LoginProps {
  onLoginSuccess: () => void
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('admin@crom.run')
  const [password, setPassword] = useState('password')
  const navigate = useNavigate()

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email && password) {
      onLoginSuccess()
      navigate('/dashboard')
    }
  }

  return (
    <div className="flex-grow flex items-center justify-center px-6 py-20 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/3 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl -z-10"></div>

      <div className="bg-slate-900/60 border border-slate-900 p-8 rounded-2xl shadow-2xl w-full max-w-sm backdrop-blur-md">
        <div className="flex flex-col items-center mb-6">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-indigo-500/20 mb-3">
            C
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Login do Painel</h2>
          <p className="text-xs text-slate-450 mt-1">Insira suas credenciais administrativas</p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded px-3 py-2 text-sm text-white outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 rounded px-3 py-2 text-sm text-white outline-none transition-colors"
            />
          </div>
          <button 
            type="submit" 
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5 cursor-pointer mt-6"
          >
            <Lock className="w-3.5 h-3.5" />
            Entrar no Editor
          </button>
        </form>
      </div>
    </div>
  )
}
