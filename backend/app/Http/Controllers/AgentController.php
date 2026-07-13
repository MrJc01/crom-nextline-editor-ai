<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Illuminate\Support\Facades\File;
use App\Models\Workspace;

class AgentController extends Controller
{
    /**
     * Handle the AI command from the frontend chat.
     */
    public function handleCommand(Request $request)
    {
        $request->validate([
            'prompt' => 'required|string',
            'workspace_id' => 'nullable|string'
        ]);

        $prompt = $request->input('prompt');
        $workspaceId = $request->input('workspace_id');

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

        // Instanciar o processo Symfony para rodar o binário Go CLI
        $process = new Process([
            $binaryPath,
            '--action=modify',
            '--prompt=' . $prompt,
            '--workspace=' . $workspacePath
        ]);

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

        return response()->json($output);
    }

    /**
     * Get the code of files in the preview workspace.
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

        $indexPath = $workspacePath . '/index.html';

        if (!File::exists($indexPath)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Arquivo index.html não encontrado no workspace.'
            ], 404);
        }

        $htmlContent = File::get($indexPath);

        return response()->json([
            'status' => 'success',
            'files' => [
                'index.html' => $htmlContent
            ]
        ]);
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
            return base_path('../frontend/public/preview-site');
        }

        $workspace = Workspace::find($workspaceId);
        if (!$workspace) {
            return null;
        }

        return base_path('../frontend/public/preview-site/workspaces/' . $workspace->id);
    }
}
