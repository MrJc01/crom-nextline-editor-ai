<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Workspace;
use App\Services\DockerService;
use App\Services\StackDetector;
use App\Services\WorkspaceTemplates;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class WorkspaceController extends Controller
{
    public function __construct(
        private DockerService $docker,
        private StackDetector $detector,
        private WorkspaceTemplates $templates,
    ) {
    }

    /**
     * Lista os workspaces, reconciliando o status real de cada contêiner.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'admin') {
            $workspaces = Workspace::orderBy('created_at', 'desc')->get();
        } else {
            $workspaces = Workspace::where('user_id', $user->id)->orderBy('created_at', 'desc')->get();
        }

        // Reconcilia o estado dos que estão marcados como ativos.
        foreach ($workspaces as $ws) {
            if (in_array($ws->status, ['running', 'starting'], true)) {
                $this->docker->syncStatus($ws);
            }
        }

        if ($user->role === 'admin') {
            $workspacesResponse = Workspace::orderBy('created_at', 'desc')->get();
        } else {
            $workspacesResponse = Workspace::where('user_id', $user->id)->orderBy('created_at', 'desc')->get();
        }

        return response()->json([
            'status' => 'success',
            'workspaces' => $workspacesResponse,
        ]);
    }

    /**
     * Cria um novo workspace e já detecta a stack do template escolhido.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'stack' => 'nullable|string|in:' . implode(',', WorkspaceTemplates::STACKS),
        ]);

        $id = (string) Str::uuid();
        $name = $request->input('name');
        $stack = $request->input('stack', 'static');

        $maxPort = Workspace::max('port');
        $port = $maxPort ? $maxPort + 1 : 9001;

        // Isolamento: workspaces vivem em storage/app/workspaces (fora do Vite).
        $workspacesBaseDir = Workspace::storageBase();
        $workspaceDir = $workspacesBaseDir . '/' . $id;

        if (!File::exists($workspacesBaseDir)) {
            File::makeDirectory($workspacesBaseDir, 0755, true);
        }
        File::makeDirectory($workspaceDir, 0755, true);

        // Gera o scaffold real da stack escolhida.
        $this->templates->scaffold($workspaceDir, $stack, $name);

        // Caminho NO HOST para o volume -v do docker run.
        $hostBaseDir = env('HOST_PROJECT_PATH', base_path('..'));
        $hostWorkspacePath = $hostBaseDir . '/backend/storage/app/workspaces/' . $id;

        // Detecta a stack a partir dos arquivos recém-criados.
        $manifest = $this->detector->detect($workspaceDir);

        $workspace = Workspace::create([
            'id' => $id,
            'name' => $name,
            'user_id' => $request->user()->id,
            'stack' => $manifest['type'],
            'framework' => $manifest['framework'],
            'port' => $port,
            'internal_port' => $manifest['internal_port'],
            'status' => 'stopped',
            'health' => 'unknown',
            'path' => $hostWorkspacePath,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Workspace criado com sucesso!',
            'workspace' => $workspace,
        ], 201);
    }

    /**
     * Sobe o contêiner de preview usando a stack detectada.
     */
    public function start(Request $request, $id)
    {
        $workspace = Workspace::findOrFail($id);
        $this->authorizeWorkspace($workspace, $request);

        if ($workspace->status === 'running' && $this->docker->syncStatus($workspace)['status'] === 'running') {
            return response()->json([
                'status' => 'success',
                'message' => 'Workspace já está rodando.',
                'workspace' => $workspace->fresh(),
            ]);
        }

        $result = $this->docker->start($workspace);
        $workspace->refresh();

        return response()->json([
            'status' => $result['ok'] ? 'success' : 'error',
            'message' => $result['message'],
            'error' => $result['error'] ?? null,
            'workspace' => $workspace,
            'preview_url' => $workspace->preview_url,
        ], $result['ok'] ? 200 : 500);
    }

    /**
     * Para o contêiner de preview.
     */
    public function stop(Request $request, $id)
    {
        $workspace = Workspace::findOrFail($id);
        $this->authorizeWorkspace($workspace, $request);
        $result = $this->docker->stop($workspace);

        return response()->json([
            'status' => 'success',
            'message' => $result['message'],
            'workspace' => $workspace->fresh(),
        ]);
    }

    /**
    /**
     * Retorna o estado real (reconciliado) do contêiner — usado no polling.
     */
    public function status(Request $request, $id)
    {
        $workspace = Workspace::findOrFail($id);
        $this->authorizeWorkspace($workspace, $request);
        $this->docker->syncStatus($workspace);

        return response()->json([
            'status' => 'success',
            'workspace' => $workspace->fresh(),
        ]);
    }

    /**
     * Logs do contêiner de preview.
     */
    public function logs(Request $request, $id)
    {
        $workspace = Workspace::findOrFail($id);
        $this->authorizeWorkspace($workspace, $request);

        return response()->json([
            'status' => 'success',
            'logs' => $this->docker->logs($workspace),
        ]);
    }

    /**
     * Serve um arquivo do workspace diretamente (fallback estático do preview
     * quando o contêiner está desligado; workspaces em storage/ não são servidos
     * pelo Vite). Protegido contra path traversal.
     */
    public function raw($id, $path = 'index.html')
    {
        $workspace = Workspace::findOrFail($id);
        $root = realpath($workspace->localPath());
        if (!$root) {
            abort(404);
        }

        $target = realpath($root . '/' . ltrim($path, '/'));
        if (!$target || (!str_starts_with($target, $root . DIRECTORY_SEPARATOR) && $target !== $root) || !is_file($target)) {
            abort(404);
        }

        return response()->file($target);
    }

    /**
     * Reinicia o contêiner de preview (stop + start) sem recriar o workspace.
     */
    public function restart(Request $request, $id)
    {
        $workspace = Workspace::findOrFail($id);
        $this->authorizeWorkspace($workspace, $request);
        $this->docker->stop($workspace);
        $result = $this->docker->start($workspace->fresh());

        return response()->json([
            'status' => $result['ok'] ? 'success' : 'error',
            'message' => $result['ok'] ? 'Preview reiniciado.' : $result['message'],
            'error' => $result['error'] ?? null,
            'workspace' => $workspace->fresh(),
        ], $result['ok'] ? 200 : 500);
    }

    /**
     * Autoriza acesso ao workspace.
     */
    private function authorizeWorkspace(Workspace $workspace, Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'admin' && $workspace->user_id !== $user->id) {
            abort(403, 'Acesso não autorizado a este workspace.');
        }
    }
}
