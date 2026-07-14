export type WorkspaceStatus = 'stopped' | 'starting' | 'running' | 'error'

export interface Workspace {
  id: string
  name: string
  stack: string | null
  framework: string | null
  port: number
  internal_port: number | null
  status: WorkspaceStatus
  health: string
  preview_url: string | null
  last_error: string | null
  path: string
  created_at: string
}

export interface Message {
  id: string
  sender: 'user' | 'ai'
  text: string
  timestamp: string
  steps?: string[]
}

export interface TerminalLog {
  timestamp: string
  source: 'laravel' | 'go' | 'crom-agent'
  type: 'info' | 'success' | 'warning'
  message: string
}

/** Nó da árvore de arquivos retornada por GET /api/files. */
export interface FileNode {
  name: string
  path: string
  type: 'file' | 'dir'
  lang?: string
  children?: FileNode[]
}

/** Arquivo aberto atualmente no editor. */
export interface OpenFile {
  path: string
  content: string
  lang: string
}
