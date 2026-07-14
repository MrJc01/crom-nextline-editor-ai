import { useState } from 'react'
import { User, Coins, Palette, Check, Shield } from 'lucide-react'

interface UserSettingsProps {
  role: 'admin' | 'client'
  clientPoints: number
  prefs: UserPrefs
  setPrefs: (p: UserPrefs) => void
}

export interface UserPrefs {
  theme: 'dark' | 'light'
}

export default function UserSettings({ role, clientPoints, prefs, setPrefs }: UserSettingsProps) {
  const [saved, setSaved] = useState(false)
  const [draft, setDraft] = useState<UserPrefs>(prefs)

  const save = () => {
    setPrefs(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="flex-grow overflow-y-auto max-w-3xl w-full mx-auto px-6 py-12 space-y-6 select-text">
      <div className="border-b border-slate-900 pb-6">
        <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <User className="w-6 h-6 text-indigo-400" /> Minhas Configurações
        </h2>
        <p className="text-xs text-slate-400 mt-1">Gerencie sua conta, créditos e preferências dos seus projetos.</p>
      </div>

      {/* Conta */}
      <section className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" /> Conta
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Perfil">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${
              role === 'admin' ? 'bg-purple-500/10 text-purple-300 border-purple-500/25' : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {role === 'admin' ? 'Administrador' : 'Cliente'}
            </span>
          </Field>
          <Field label="Créditos disponíveis">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-mono font-bold text-sm">
              <Coins className="w-4 h-4" /> {clientPoints} pontos
            </span>
          </Field>
        </div>
        <p className="text-[11px] text-slate-500">Cada modificação via IA consome pontos. Precisa de mais? Fale com o administrador da sua conta.</p>
      </section>

      {/* Preferências */}
      <section className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-400" /> Preferências
        </h3>

        <Field label="Tema da interface">
          <div className="flex gap-2">
            {(['dark', 'light'] as const).map(t => (
              <button
                key={t}
                onClick={() => setDraft({ ...draft, theme: t })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  draft.theme === t ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                {t === 'dark' ? 'Escuro' : 'Claro'}
              </button>
            ))}
          </div>
        </Field>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          Salvar preferências
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
            <Check className="w-4 h-4" /> Preferências salvas!
          </span>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}
