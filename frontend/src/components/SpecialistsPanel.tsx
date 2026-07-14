import { useEffect, useState } from 'react'
import { Layers, Palette, Code2, ShieldCheck, Sparkles, Check, Loader2 } from 'lucide-react'

/**
 * Painel de especialistas (Mixture of Agents sequencial).
 * Simula uma cadeia de agentes especialistas analisando o pedido em sequência,
 * cada um refinando a proposta do anterior, até o agregador final.
 */

export interface Specialist {
  id: string
  name: string
  role: string
  icon: 'layout' | 'design' | 'code' | 'review' | 'aggregator'
  contribution: (prompt: string) => string
}

export const SPECIALISTS: Specialist[] = [
  {
    id: 'arch',
    name: 'Arquiteto de Layout',
    role: 'Estrutura e hierarquia',
    icon: 'layout',
    contribution: (p) => `Mapeei onde "${truncate(p)}" se encaixa na estrutura da página e defini a hierarquia dos blocos.`,
  },
  {
    id: 'ux',
    name: 'Especialista em UX/UI',
    role: 'Usabilidade e estética',
    icon: 'design',
    contribution: () => 'Ajustei espaçamentos, contraste e ritmo visual para manter consistência com o design system.',
  },
  {
    id: 'fe',
    name: 'Engenheiro Frontend',
    role: 'Implementação',
    icon: 'code',
    contribution: () => 'Traduzi as decisões em HTML/CSS semântico e responsivo, pronto para o preview.',
  },
  {
    id: 'qa',
    name: 'Revisor de Código',
    role: 'Qualidade e acessibilidade',
    icon: 'review',
    contribution: () => 'Revisei acessibilidade, responsividade e removi redundâncias antes de escrever no disco.',
  },
  {
    id: 'agg',
    name: 'Agregador Crom',
    role: 'Síntese final (MoA)',
    icon: 'aggregator',
    contribution: () => 'Combinei as contribuições dos especialistas na versão final aplicada ao arquivo.',
  },
]

function truncate(s: string, n = 42) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

function iconFor(icon: Specialist['icon'], className: string) {
  switch (icon) {
    case 'layout': return <Layers className={className} />
    case 'design': return <Palette className={className} />
    case 'code': return <Code2 className={className} />
    case 'review': return <ShieldCheck className={className} />
    case 'aggregator': return <Sparkles className={className} />
  }
}

interface SpecialistsPanelProps {
  active: boolean
  prompt: string
  /** ms que cada especialista leva para "pensar" (default 650) */
  stepMs?: number
}

export default function SpecialistsPanel({ active, prompt, stepMs = 650 }: SpecialistsPanelProps) {
  // Índice do especialista atualmente processando (-1 = não iniciado, length = todos concluídos).
  const [current, setCurrent] = useState(-1)

  useEffect(() => {
    if (!active) {
      setCurrent(-1)
      return
    }
    setCurrent(0)
    let i = 0
    const timer = setInterval(() => {
      i += 1
      setCurrent(i)
      if (i >= SPECIALISTS.length) clearInterval(timer)
    }, stepMs)
    return () => clearInterval(timer)
  }, [active, prompt, stepMs])

  if (!active) return null

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 uppercase tracking-wide">
        <Sparkles className="w-3.5 h-3.5" />
        Painel de Especialistas (MoA sequencial)
      </div>
      <div className="space-y-1.5">
        {SPECIALISTS.map((spec, idx) => {
          const state = idx < current ? 'done' : idx === current ? 'thinking' : 'waiting'
          return (
            <div
              key={spec.id}
              className={`flex items-start gap-2.5 rounded-lg px-2.5 py-1.5 transition-all ${
                state === 'thinking' ? 'bg-slate-800/60' : ''
              } ${state === 'waiting' ? 'opacity-40' : 'opacity-100'}`}
            >
              <div className={`mt-0.5 h-6 w-6 rounded-md flex items-center justify-center shrink-0 border ${
                state === 'done' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : state === 'thinking' ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}>
                {state === 'done' ? <Check className="w-3.5 h-3.5" />
                  : state === 'thinking' ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : iconFor(spec.icon, 'w-3.5 h-3.5')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200 truncate">{spec.name}</span>
                  <span className="text-[9px] text-slate-500 truncate">{spec.role}</span>
                </div>
                {state === 'done' && (
                  <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{spec.contribution(prompt)}</p>
                )}
                {state === 'thinking' && (
                  <p className="text-[11px] text-indigo-300/70 leading-snug mt-0.5">analisando…</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Gera os passos dos especialistas para anexar à mensagem final da IA. */
export function specialistSteps(prompt: string): string[] {
  return SPECIALISTS.map(s => `${s.name}: ${s.contribution(prompt)}`)
}
