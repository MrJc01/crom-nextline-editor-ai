<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Illuminate\Support\Facades\File;
use App\Models\Workspace;
use App\Models\Client;
use App\Models\Setting;
use App\Services\FileTreeService;
use App\Services\DockerService;

class AgentController extends Controller
{
    public function __construct(private FileTreeService $tree, private DockerService $docker)
    {
    }

    /**
     * Handle the AI command from the frontend chat.
     */
    public function handleCommand(Request $request)
    {
        $request->validate([
            'prompt' => 'required|string',
            'workspace_id' => 'nullable|string',
            'client_id' => 'nullable|string',
            'user_api_key' => 'nullable|string',
            'model' => 'nullable|string',
        ]);

        $prompt = $request->input('prompt');
        $workspaceId = $request->input('workspace_id');
        $userApiKey = $request->input('user_api_key');

        $user = $request->user();
        $isAdmin = $user && $user->role === 'admin';

        // Buscar cliente e saldo de pontos baseado no e-mail do usuário logado
        if ($user) {
            $client = Client::where('email', $user->email)->first();
            if (!$client) {
                $client = Client::create([
                    'name' => $user->name,
                    'email' => $user->email,
                    'points' => 500,
                ]);
            }
        } else {
            $clientId = $request->input('client_id') ?? '11111111-1111-1111-1111-111111111111';
            $client = Client::firstOrCreate(
                ['id' => $clientId],
                ['name' => 'Cliente de Teste', 'email' => 'client@crom.run', 'points' => 500]
            );
        }

        // Buscar custo da requisição nas configurações
        $cost = (int)(Setting::where('key', 'points_cost_per_request')->value('value') ?? 10);
        $adminKey = Setting::where('key', 'openrouter_api_key')->value('value') ?? '';

        // Se o usuário trouxe a própria chave (BYO), não debita créditos da plataforma.
        $usingOwnKey = !empty($userApiKey);
        $effectiveKey = $usingOwnKey ? $userApiKey : $adminKey;

        if (!$isAdmin && !$usingOwnKey && $client->points < $cost) {
            return response()->json([
                'status' => 'error',
                'message' => 'Saldo de pontos insuficiente para rodar o agente! Você possui apenas ' . $client->points . ' pontos de um custo de ' . $cost . '.',
                'steps' => ['Verificação de saldo de pontos falhou.']
            ], 403);
        }

        $binaryPath = base_path('../cli/crom-cli');
        
        // Determinar o caminho local do workspace
        $workspacePath = $this->getWorkspaceLocalPath($workspaceId);

        if (!$workspacePath) {
            return response()->json([
                'status' => 'error',
                'message' => 'Workspace inválido ou não encontrado.',
                'steps' => ['Resolução do workspace falhou']
            ], 404);
        }

        // Arquivo alvo opcional (default index.html no próprio CLI).
        $targetFile = $request->input('file', 'index.html');

        // Resolução do modelo de IA
        $model = $request->input('model') ?? Setting::where('key', 'default_model')->value('value') ?? 'google/gemini-2.5-flash';

        // Instanciar o processo Symfony para rodar o binário Go CLI
        $process = new Process([
            $binaryPath,
            '--action=modify',
            '--prompt=' . $prompt,
            '--workspace=' . $workspacePath,
            '--file=' . $targetFile,
            '--model=' . $model,
        ]);

        // Propagar a chave efetiva (própria do usuário ou a do admin)
        if (!empty($effectiveKey)) {
            $process->setEnv([
                'OPENROUTER_API_KEY' => $effectiveKey
            ]);
        }

        // Executar o processo
        $process->run();

        if (!$process->isSuccessful()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erro ao executar o wrapper Go CLI.',
                'error' => $process->getErrorOutput(),
                'steps' => ['Execução do wrapper CLI falhou']
            ], 500);
        }

        // Decodificar o output JSON do binário Go
        $output = json_decode($process->getOutput(), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erro ao parsear output da CLI.',
                'raw_output' => $process->getOutput(),
                'steps' => ['Parse do output falhou']
            ], 500);
        }

        // Se deu sucesso, debitar pontos do cliente (a menos que seja admin ou use a própria chave).
        if (isset($output['status']) && $output['status'] === 'success') {
            if (!$isAdmin && !$usingOwnKey) {
                $client->decrement('points', $cost);
            }
            $output['client_points'] = $client->fresh()->points;
            $output['billed'] = !$isAdmin && !$usingOwnKey;

            // Reinicia o contêiner de preview APENAS se a stack mudou ou dependências cruciais foram alteradas.
            // Para edições simples de HTML/CSS/JS (estáticos ou dinâmicos), o volume do Docker reflete as alterações
            // instantaneamente sem necessidade de reiniciar o contêiner.
            $workspace = Workspace::find($workspaceId);
            if ($workspace && $workspace->status === 'running') {
                $oldStack = $workspace->stack;
                $manifest = app(\App\Services\StackDetector::class)->detect($workspace->localPath());
                $newStack = $manifest['type'] ?? 'static';

                $mustRestart = ($oldStack !== $newStack);

                if (!$mustRestart && isset($output['changed_files']) && is_array($output['changed_files'])) {
                    foreach ($output['changed_files'] as $file) {
                        $base = basename($file);
                        if (in_array($base, ['package.json', 'composer.json', 'requirements.txt', 'go.mod', 'package-lock.json'])) {
                            $mustRestart = true;
                            break;
                        }
                    }
                }

                if ($mustRestart) {
                    $this->docker->stop($workspace);
                    $this->docker->start($workspace->fresh());
                }
            }
        }

        return response()->json($output);
    }

    /**
     * Retorna a árvore de arquivos completa do workspace.
     */
    public function getFiles(Request $request)
    {
        $workspaceId = $request->query('workspace_id');
        $workspacePath = $this->getWorkspaceLocalPath($workspaceId);

        if (!$workspacePath) {
            return response()->json([
                'status' => 'error',
                'message' => 'Workspace inválido ou não encontrado.'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'tree' => $this->tree->tree($workspacePath),
        ]);
    }

    /**
     * Lê o conteúdo de um arquivo específico do workspace.
     */
    public function getFile(Request $request)
    {
        $request->validate([
            'workspace_id' => 'required|string',
            'path' => 'required|string',
        ]);

        $workspacePath = $this->getWorkspaceLocalPath($request->query('workspace_id'));
        if (!$workspacePath) {
            return response()->json(['status' => 'error', 'message' => 'Workspace inválido.'], 404);
        }

        $result = $this->tree->read($workspacePath, $request->query('path'));
        if (!$result['ok']) {
            return response()->json(['status' => 'error', 'message' => $result['error']], 422);
        }

        return response()->json([
            'status' => 'success',
            'path' => $request->query('path'),
            'content' => $result['content'],
            'lang' => $result['lang'],
        ]);
    }

    /**
     * Salva a edição manual de um arquivo do workspace.
     */
    public function saveFile(Request $request)
    {
        $request->validate([
            'workspace_id' => 'required|string',
            'path' => 'required|string',
            'content' => 'present|string',
        ]);

        $workspacePath = $this->getWorkspaceLocalPath($request->input('workspace_id'));
        if (!$workspacePath) {
            return response()->json(['status' => 'error', 'message' => 'Workspace inválido.'], 404);
        }

        $result = $this->tree->write($workspacePath, $request->input('path'), $request->input('content'));
        if (!$result['ok']) {
            return response()->json(['status' => 'error', 'message' => $result['error']], 422);
        }

        return response()->json(['status' => 'success', 'message' => 'Arquivo salvo.']);
    }

    /**
     * Cria um arquivo ou pasta no workspace.
     */
    public function createEntry(Request $request)
    {
        $request->validate([
            'workspace_id' => 'required|string',
            'path' => 'required|string',
            'type' => 'required|in:file,dir',
        ]);

        $workspacePath = $this->getWorkspaceLocalPath($request->input('workspace_id'));
        if (!$workspacePath) {
            return response()->json(['status' => 'error', 'message' => 'Workspace inválido.'], 404);
        }

        $result = $this->tree->create($workspacePath, $request->input('path'), $request->input('type') === 'dir');
        return $result['ok']
            ? response()->json(['status' => 'success', 'message' => 'Criado.'])
            : response()->json(['status' => 'error', 'message' => $result['error']], 422);
    }

    /**
     * Renomeia/move um arquivo ou pasta.
     */
    public function renameEntry(Request $request)
    {
        $request->validate([
            'workspace_id' => 'required|string',
            'from' => 'required|string',
            'to' => 'required|string',
        ]);

        $workspacePath = $this->getWorkspaceLocalPath($request->input('workspace_id'));
        if (!$workspacePath) {
            return response()->json(['status' => 'error', 'message' => 'Workspace inválido.'], 404);
        }

        $result = $this->tree->rename($workspacePath, $request->input('from'), $request->input('to'));
        return $result['ok']
            ? response()->json(['status' => 'success', 'message' => 'Renomeado.'])
            : response()->json(['status' => 'error', 'message' => $result['error']], 422);
    }

    /**
     * Exclui um arquivo ou pasta.
     */
    public function deleteEntry(Request $request)
    {
        $request->validate([
            'workspace_id' => 'required|string',
            'path' => 'required|string',
        ]);

        $workspacePath = $this->getWorkspaceLocalPath($request->input('workspace_id'));
        if (!$workspacePath) {
            return response()->json(['status' => 'error', 'message' => 'Workspace inválido.'], 404);
        }

        $result = $this->tree->delete($workspacePath, $request->input('path'));
        return $result['ok']
            ? response()->json(['status' => 'success', 'message' => 'Excluído.'])
            : response()->json(['status' => 'error', 'message' => $result['error']], 422);
    }

    /**
     * Reset the preview workspace back to original state.
     */
    public function resetWorkspace(Request $request)
    {
        $workspaceId = $request->input('workspace_id');
        $binaryPath = base_path('../cli/crom-cli');
        $workspacePath = $this->getWorkspaceLocalPath($workspaceId);

        if (!$workspacePath) {
            return response()->json([
                'status' => 'error',
                'message' => 'Workspace inválido ou não encontrado.'
            ], 404);
        }

        $process = new Process([
            $binaryPath,
            '--action=reset',
            '--workspace=' . $workspacePath
        ]);

        $process->run();

        if (!$process->isSuccessful()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erro ao resetar o workspace.',
                'error' => $process->getErrorOutput()
            ], 500);
        }

        $output = json_decode($process->getOutput(), true);
        return response()->json($output);
    }

    /**
     * Helper to resolve the workspace local path in the container.
     */
    private function getWorkspaceLocalPath($workspaceId)
    {
        if (empty($workspaceId)) {
            return null;
        }

        $workspace = Workspace::find($workspaceId);
        if (!$workspace) {
            return null;
        }

        // Authorize: check ownership if user is logged in
        $user = auth()->user();
        if ($user && $user->role !== 'admin' && $workspace->user_id !== $user->id) {
            abort(403, 'Acesso não autorizado a este workspace.');
        }

        // Resolve storage/ (novos) ou o local legado (antigos) automaticamente.
        return $workspace->localPath();
    }
}
