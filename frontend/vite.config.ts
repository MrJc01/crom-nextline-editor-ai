import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // Os arquivos dos workspaces de preview vivem em public/preview-site/.
      // Sem isso, quando o agente edita um workspace, o Vite faz full-reload da
      // página do editor e o usuário perde o estado (caía de volta no login).
      ignored: ['**/public/preview-site/**'],
    },
  },
})
