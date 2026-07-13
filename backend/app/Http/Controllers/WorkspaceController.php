<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Workspace;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;

class WorkspaceController extends Controller
{
    /**
     * List all workspaces.
     */
    public function index()
    {
        return response()->json([
            'status' => 'success',
            'workspaces' => Workspace::orderBy('created_at', 'desc')->get()
        ]);
    }

    /**
     * Create a new workspace.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $id = (string) Str::uuid();
        $name = $request->input('name');

        // Alocar próxima porta disponível a partir de 9000
        $maxPort = Workspace::max('port');
        $port = $maxPort ? $maxPort + 1 : 9001;

        // Caminhos de pasta locais (no container Laravel)
        $workspacesBaseDir = base_path('../frontend/public/preview-site/workspaces');
        $workspaceDir = $workspacesBaseDir . '/' . $id;

        if (!File::exists($workspacesBaseDir)) {
            File::makeDirectory($workspacesBaseDir, 0755, true);
        }

        // Criar o diretório do workspace
        File::makeDirectory($workspaceDir, 0755, true);

        // Copiar o template padrão index.html
        $defaultHTML = $this->getDefaultTemplateHTML($name);
        File::put($workspaceDir . '/index.html', $defaultHTML);

        // Caminho absoluto no HOST para montagem de volume Docker
        $hostBaseDir = env('HOST_PROJECT_PATH', '/home/j/Documentos/GitHub/crom-nextline-editor-ai');
        $hostWorkspacePath = $hostBaseDir . '/frontend/public/preview-site/workspaces/' . $id;

        // Registrar no banco de dados
        $workspace = Workspace::create([
            'id' => $id,
            'name' => $name,
            'port' => $port,
            'status' => 'stopped',
            'path' => $hostWorkspacePath,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Workspace criado com sucesso!',
            'workspace' => $workspace
        ], 201);
    }

    /**
     * Start the Docker container for the workspace preview.
     */
    public function start($id)
    {
        $workspace = Workspace::findOrFail($id);

        if ($workspace->status === 'running') {
            return response()->json([
                'status' => 'success',
                'message' => 'Workspace já está rodando.',
                'workspace' => $workspace
            ]);
        }

        $containerName = 'crom_ws_' . $workspace->id;
        
        // 1. Garantir que não há contêiner órfão com o mesmo nome
        $clearProcess = new Process(['docker', 'rm', '-f', $containerName]);
        $clearProcess->run();

        // 2. Rodar o contêiner nginx:alpine expondo a porta alocada e montando a pasta como volume
        $runProcess = new Process([
            'docker', 'run', '-d',
            '--name', $containerName,
            '-p', $workspace->port . ':80',
            '-v', $workspace->path . ':/usr/share/nginx/html:ro',
            'nginx:alpine'
        ]);

        $runProcess->run();

        if (!$runProcess->isSuccessful()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Falha ao iniciar contêiner Docker para o preview.',
                'error' => $runProcess->getErrorOutput()
            ], 500);
        }

        // Atualizar status no banco
        $workspace->update(['status' => 'running']);

        return response()->json([
            'status' => 'success',
            'message' => 'Preview do Workspace iniciado no Docker.',
            'workspace' => $workspace,
            'preview_url' => 'http://localhost:' . $workspace->port
        ]);
    }

    /**
     * Stop the Docker container for the workspace preview.
     */
    public function stop($id)
    {
        $workspace = Workspace::findOrFail($id);

        if ($workspace->status === 'stopped') {
            return response()->json([
                'status' => 'success',
                'message' => 'Workspace já está parado.',
                'workspace' => $workspace
            ]);
        }

        $containerName = 'crom_ws_' . $workspace->id;

        // Parar e remover o contêiner
        $stopProcess = new Process(['docker', 'rm', '-f', $containerName]);
        $stopProcess->run();

        if (!$stopProcess->isSuccessful()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Falha ao remover contêiner Docker do preview.',
                'error' => $stopProcess->getErrorOutput()
            ], 500);
        }

        // Atualizar status no banco
        $workspace->update(['status' => 'stopped']);

        return response()->json([
            'status' => 'success',
            'message' => 'Preview do Workspace parado com sucesso.',
            'workspace' => $workspace
        ]);
    }

    /**
     * Get default template HTML for new workspaces.
     */
    private function getDefaultTemplateHTML($projectName)
    {
        $name = htmlspecialchars($projectName);
        return <<<HTML
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #0f172a; color: #f8fafc; font-family: system-ui, sans-serif; }
  </style>
</head>
<body class="flex flex-col min-h-screen">
  <!-- Header -->
  <header class="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex justify-between items-center sticky top-0 z-50">
    <div class="flex items-center gap-3">
      <div class="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">W</div>
      <span class="font-bold tracking-tight text-white text-lg">{$name}</span>
    </div>
    <nav class="flex items-center gap-6">
      <a href="#" class="text-slate-400 hover:text-white text-sm transition-colors">Home</a>
      <a href="#" class="text-slate-400 hover:text-white text-sm transition-colors">Sobre</a>
      <a href="#" class="text-slate-400 hover:text-white text-sm transition-colors">Serviços</a>
    </nav>
  </header>

  <!-- Hero Section -->
  <main class="flex-grow flex items-center justify-center px-6 py-20 relative overflow-hidden">
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/10 via-slate-950 to-slate-950 -z-10"></div>
    <div class="text-center max-w-2xl mx-auto">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-6">
        <span class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span>
        Workspace Ativo
      </div>
      <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight text-white bg-gradient-to-r from-purple-200 via-indigo-300 to-pink-300 bg-clip-text text-transparent leading-none py-2">
        {$name}
      </h1>
      <p class="mt-6 text-slate-400 text-base md:text-lg leading-relaxed">
        Este é o site inicial do seu novo projeto. Peça modificações no chat e veja o Crom Agente modificar este código ao vivo!
      </p>
    </div>
  </main>

  <!-- Footer -->
  <footer class="border-t border-slate-800/80 bg-slate-950/80 py-8 px-6 text-center text-slate-500 text-xs">
    &copy; 2026 {$name}. Todos os direitos reservados.
  </footer>
</body>
</html>
HTML;
    }
}
