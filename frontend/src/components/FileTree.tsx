import { useState } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileCode, FileJson, FileText, FileType } from 'lucide-react'
import type { FileNode } from '../types'

function iconFor(node: FileNode) {
  if (node.type === 'dir') return null
  const lang = node.lang || 'text'
  if (lang === 'json') return <FileJson className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
  if (['html', 'htm'].includes(lang)) return <FileType className="w-3.5 h-3.5 text-orange-400/80 shrink-0" />
  if (['css', 'scss'].includes(lang)) return <FileType className="w-3.5 h-3.5 text-sky-400/80 shrink-0" />
  if (['js', 'jsx', 'ts', 'tsx', 'go', 'php', 'py', 'vue', 'rb'].includes(lang))
    return <FileCode className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
  return <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
}

interface NodeRowProps {
  node: FileNode
  depth: number
  selectedPath: string | null
  onSelect: (node: FileNode) => void
}

function NodeRow({ node, depth, selectedPath, onSelect }: NodeRowProps) {
  const [open, setOpen] = useState(depth < 1)

  if (node.type === 'dir') {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-1 py-1 pr-2 text-xs text-slate-300 hover:bg-slate-800/50 rounded transition-colors cursor-pointer"
          style={{ paddingLeft: `${depth * 12 + 6}px` }}
        >
          {open ? <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />}
          {open ? <FolderOpen className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" />}
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children && (
          <div>
            {node.children.map(child => (
              <NodeRow key={child.path} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const isSelected = selectedPath === node.path
  return (
    <button
      onClick={() => onSelect(node)}
      className={`w-full flex items-center gap-1.5 py-1 pr-2 text-xs rounded transition-colors cursor-pointer ${
        isSelected ? 'bg-indigo-500/15 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      {iconFor(node)}
      <span className="truncate">{node.name}</span>
    </button>
  )
}

interface FileTreeProps {
  tree: FileNode[]
  selectedPath: string | null
  onSelect: (node: FileNode) => void
  loading?: boolean
}

export default function FileTree({ tree, selectedPath, onSelect, loading }: FileTreeProps) {
  if (loading) {
    return <p className="text-slate-500 text-xs italic px-3 py-4">Carregando árvore de arquivos...</p>
  }
  if (!tree.length) {
    return <p className="text-slate-500 text-xs italic px-3 py-4">Nenhum arquivo neste workspace ainda.</p>
  }
  return (
    <div className="py-1">
      {tree.map(node => (
        <NodeRow key={node.path} node={node} depth={0} selectedPath={selectedPath} onSelect={onSelect} />
      ))}
    </div>
  )
}
