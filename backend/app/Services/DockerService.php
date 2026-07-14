<?php

namespace App\Services;

use App\Models\Workspace;
use Symfony\Component\Process\Process;

/**
 * Encapsula todo o ciclo de vida do contêiner de preview de um workspace:
 * subir com a imagem/comando corretos (vindos do StackDetector), consultar o
 * estado real no Docker e reconciliar com o banco, parar e ler logs.
 */
class DockerService
{
    /** Grace period (s) para o contêiner sobreviver ao boot antes de marcar healthy. */
    private const BOOT_GRACE = 3;

    public function __construct(private StackDetector $detector)
    {
    }

    private function containerName(Workspace $ws): string
    {
        return 'crom_ws_' . $ws->id;
    }

    /**
     * Sobe o contêiner de preview usando a stack detectada.
     *
     * @return array{ok:bool,message:string,error?:string}
     */
    public function start(Workspace $ws): array
    {
        if (!$this->dockerAvailable()) {
            $ws->update(['status' => 'error', 'last_error' => 'Cliente Docker indisponível no backend.']);
            return ['ok' => false, 'message' => 'Docker indisponível', 'error' => 'binário docker não encontrado ou socket sem permissão'];
        }

        // Detecta a stack lendo os arquivos pelo caminho LOCAL do contêiner;
        // o volume -v (mais abaixo) usa o caminho no HOST ($ws->path).
        $manifest = $this->detector->detect($ws->localPath());
        $name = $this->containerName($ws);

        // Remove qualquer contêiner órfão com o mesmo nome.
        (new Process(['docker', 'rm', '-f', $name]))->run();

        $args = $this->buildRunArgs($ws, $manifest);
        $run = new Process($args);
        $run->setTimeout(120);
        $run->run();

        if (!$run->isSuccessful()) {
            $err = trim($run->getErrorOutput()) ?: 'erro desconhecido ao executar docker run';
            $ws->update(['status' => 'error', 'health' => 'exited', 'last_error' => $err]);
            return ['ok' => false, 'message' => 'Falha ao subir o contêiner de preview.', 'error' => $err];
        }

        $containerId = trim($run->getOutput());

        // Persiste stack + container antes do health check.
        $type = env('PREVIEW_URL_TYPE', 'port');
        $baseUrl = env('PREVIEW_BASE_URL', 'http://localhost:8000');

        if ($type === 'subdomain') {
            $host = parse_url($baseUrl, PHP_URL_HOST);
            $scheme = parse_url($baseUrl, PHP_URL_SCHEME) ?? 'http';
            $port = parse_url($baseUrl, PHP_URL_PORT);
            $portSuffix = $port ? ':' . $port : '';
            $previewUrl = $scheme . '://' . ($ws->slug ?? \Illuminate\Support\Str::slug($ws->name)) . '.' . $host . $portSuffix;
        } elseif ($type === 'path') {
            $previewUrl = rtrim($baseUrl, '/') . '/preview/' . ($ws->slug ?? \Illuminate\Support\Str::slug($ws->name));
        } else {
            $previewUrl = 'http://localhost:' . $ws->port;
        }

        $ws->update([
            'stack' => $manifest['type'],
            'framework' => $manifest['framework'],
            'internal_port' => $manifest['internal_port'],
            'container_id' => $containerId,
            'status' => 'starting',
            'health' => 'starting',
            'preview_url' => $previewUrl,
            'last_error' => null,
        ]);

        // Health check: se o contêiner morrer no boot (ex: erro de instalação), captura o motivo.
        sleep(self::BOOT_GRACE);
        if ($this->isRunning($containerId)) {
            $ws->update(['status' => 'running', 'health' => 'healthy']);
            return ['ok' => true, 'message' => 'Preview iniciado (' . $this->detector->label($manifest) . ').'];
        }

        $logs = $this->fetchLogs($containerId, 30);
        $ws->update(['status' => 'error', 'health' => 'exited', 'last_error' => $logs ?: 'O contêiner encerrou logo após iniciar.']);
        return ['ok' => false, 'message' => 'O contêiner iniciou mas encerrou. Veja os logs.', 'error' => $logs];
    }

    /**
     * Monta os argumentos do `docker run` conforme a stack.
     */
    private function buildRunArgs(Workspace $ws, array $manifest): array
    {
        $name = $this->containerName($ws);
        $limits = ['--memory', '512m', '--cpus', '1', '--pids-limit', '256'];
        $label = ['--label', 'crom.workspace=' . $ws->id];

        // Estático: Nginx serve a pasta montada como read-only.
        if ($manifest['type'] === 'static') {
            return array_merge(
                ['docker', 'run', '-d', '--name', $name, '-p', $ws->port . ':80'],
                $limits, $label,
                ['-v', $ws->path . ':/usr/share/nginx/html:ro', 'nginx:alpine']
            );
        }

        // Demais stacks: monta o projeto em /app, roda install && start via shell.
        $env = [];
        foreach ($manifest['env'] as $k => $v) {
            $env[] = '-e';
            $env[] = "$k=$v";
        }

        $shell = $manifest['install']
            ? $manifest['install'] . ' && ' . $manifest['start']
            : $manifest['start'];

        return array_merge(
            ['docker', 'run', '-d', '--name', $name, '-p', $ws->port . ':' . $manifest['internal_port']],
            $limits, $label, $env,
            ['-v', $ws->path . ':/app', '-w', '/app', $manifest['image'], 'sh', '-c', $shell]
        );
    }

    /**
     * Consulta o estado real do contêiner e reconcilia com o banco.
     *
     * @return array{status:string,health:string,preview_url:?string}
     */
    public function syncStatus(Workspace $ws): array
    {
        if (!$ws->container_id) {
            if ($ws->status === 'running') {
                $ws->update(['status' => 'stopped', 'health' => 'unknown']);
            }
            return ['status' => $ws->status, 'health' => $ws->health, 'preview_url' => null];
        }

        if ($this->isRunning($ws->container_id)) {
            if ($ws->status !== 'running') {
                $ws->update(['status' => 'running', 'health' => 'healthy']);
            }
            return ['status' => 'running', 'health' => 'healthy', 'preview_url' => $ws->preview_url];
        }

        // Contêiner não está mais rodando: reconcilia.
        $ws->update(['status' => 'stopped', 'health' => 'exited', 'container_id' => null]);
        return ['status' => 'stopped', 'health' => 'exited', 'preview_url' => null];
    }

    /**
     * Para e remove o contêiner de preview.
     *
     * @return array{ok:bool,message:string,error?:string}
     */
    public function stop(Workspace $ws): array
    {
        $target = $ws->container_id ?: $this->containerName($ws);
        $stop = new Process(['docker', 'rm', '-f', $target]);
        $stop->run();

        // `docker rm -f` de um contêiner inexistente não é um erro fatal aqui —
        // o objetivo (não estar rodando) foi atingido de qualquer forma.
        $ws->update(['status' => 'stopped', 'health' => 'unknown', 'container_id' => null, 'preview_url' => null]);

        return ['ok' => true, 'message' => 'Preview parado.'];
    }

    /**
     * Retorna as últimas linhas de log do contêiner.
     */
    public function logs(Workspace $ws, int $lines = 200): string
    {
        if (!$ws->container_id) {
            return '';
        }
        return $this->fetchLogs($ws->container_id, $lines);
    }

    private function fetchLogs(string $containerId, int $lines): string
    {
        $p = new Process(['docker', 'logs', '--tail', (string) $lines, $containerId]);
        $p->run();
        return trim($p->getOutput() . "\n" . $p->getErrorOutput());
    }

    private function isRunning(string $containerId): bool
    {
        $p = new Process(['docker', 'inspect', '-f', '{{.State.Running}}', $containerId]);
        $p->run();
        return $p->isSuccessful() && trim($p->getOutput()) === 'true';
    }

    private function dockerAvailable(): bool
    {
        $p = new Process(['docker', 'version', '--format', '{{.Server.Version}}']);
        $p->setTimeout(5);
        $p->run();
        return $p->isSuccessful();
    }
}
