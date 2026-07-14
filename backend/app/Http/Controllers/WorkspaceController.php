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

        $slug = \Illuminate\Support\Str::slug($name);
        $baseSlug = $slug;
        $count = 0;
        while (Workspace::where('slug', $slug)->exists()) {
            $count++;
            $slug = $baseSlug . '-' . $count;
        }

        $workspace = Workspace::create([
            'id' => $id,
            'name' => $name,
            'slug' => $slug,
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
     * Serve um arquivo do workspace a partir do seu slug (para preview amigável/subdomínio).
     */
    public function rawBySlug(Request $request, $slug, $path = 'index.html')
    {
        // Se a rota receber slug como parâmetro da rota de subdomínio, ou se vier do path
        $workspace = Workspace::where('slug', $slug)->firstOrFail();

        // Se o stack for dinâmico (não-estático) e o container estiver rodando, faz proxy para a porta real
        if ($workspace->stack !== 'static' && $workspace->status === 'running') {
            $port = $workspace->port;
            $url = 'http://127.0.0.1:' . $port . '/' . ltrim($path ?? '', '/');
            if ($request->getQueryString()) {
                $url .= '?' . $request->getQueryString();
            }

            try {
                $client = new \GuzzleHttp\Client([
                    'timeout' => 5,
                    'http_errors' => false
                ]);
                
                $response = $client->request($request->method(), $url, [
                    'headers' => [
                        'Accept' => $request->header('Accept'),
                        'User-Agent' => $request->header('User-Agent'),
                    ],
                    'body' => $request->getContent()
                ]);

                return response($response->getBody()->getContents(), $response->getStatusCode())
                    ->header('Content-Type', $response->getHeaderLine('Content-Type'));
            } catch (\Exception $e) {
                // Fallback para ler arquivos locais em caso de timeout
            }
        }

        $root = realpath($workspace->localPath());
        if (!$root) {
            abort(404);
        }

        // Se path for nulo ou vazio, padrão para index.html
        if (empty($path)) {
            $path = 'index.html';
        }

        $target = realpath($root . '/' . ltrim($path, '/'));
        if (!$target || (!str_starts_with($target, $root . DIRECTORY_SEPARATOR) && $target !== $root) || !is_file($target)) {
            abort(404);
        }

        return response()->file($target);
    }

    /**
     * Download the workspace directory as a ZIP file.
     */
    public function download(Request $request, $id)
    {
        $workspace = Workspace::findOrFail($id);
        $this->authorizeWorkspace($workspace, $request);

        $root = realpath($workspace->localPath());
        if (!$root || !is_dir($root)) {
            abort(404, 'Diretório do workspace não encontrado.');
        }

        $zip = new \ZipArchive();
        $zipFileName = tempnam(sys_get_temp_dir(), 'crom_ws_') . '.zip';

        if ($zip->open($zipFileName, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Não foi possível criar o arquivo ZIP.');
        }

        $files = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($root, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($files as $name => $file) {
            if (!$file->isDir()) {
                $filePath = $file->getRealPath();
                $relativePath = substr($filePath, strlen($root) + 1);

                // Ignora dependências pesadas e cache no zip
                if (preg_match('/^(node_modules|vendor|\.git|dist|build|\.next)\b/', $relativePath)) {
                    continue;
                }

                $zip->addFile($filePath, $relativePath);
            }
        }

        $zip->close();

        return response()->download($zipFileName, $workspace->slug . '.zip')->deleteFileAfterSend(true);
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
