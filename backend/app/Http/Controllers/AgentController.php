<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Illuminate\Support\Facades\File;

class AgentController extends Controller
{
    /**
     * Handle the AI command from the frontend chat.
     */
    public function handleCommand(Request $request)
    {
        $request->validate([
            'prompt' => 'required|string',
        ]);

        $prompt = $request->input('prompt');
        $binaryPath = base_path('../cli/crom-cli');
        $workspacePath = base_path('../frontend/public/preview-site');

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
    public function getFiles()
    {
        $workspacePath = base_path('../frontend/public/preview-site');
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
    public function resetWorkspace()
    {
        $binaryPath = base_path('../cli/crom-cli');
        $workspacePath = base_path('../frontend/public/preview-site');

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
}
