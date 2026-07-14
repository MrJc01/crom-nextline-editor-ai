<?php

namespace App\Services;

use Illuminate\Support\Facades\File;

/**
 * Inspeciona os arquivos de um workspace e decide qual runtime ele precisa,
 * devolvendo um manifesto normalizado para o DockerService subir o contêiner correto.
 *
 * Regras e tabela de prioridade documentadas em docs/stack-detection.md.
 */
class StackDetector
{
    /**
     * Detecta a stack de um diretório de workspace.
     *
     * @return array{type:string,framework:?string,image:string,install:?string,start:string,internal_port:int,env:array}
     */
    public function detect(string $workspacePath): array
    {
        // 0. Override manual tem prioridade máxima.
        if ($override = $this->readOverride($workspacePath)) {
            return $override;
        }

        // 1. Node
        if (File::exists("$workspacePath/package.json")) {
            return $this->detectNode($workspacePath);
        }

        // 2. PHP / Laravel
        if (File::exists("$workspacePath/artisan") && File::exists("$workspacePath/composer.json")) {
            return $this->manifest('php', 'laravel', 'php:8.4-cli-alpine', 'composer install --no-interaction --prefer-dist', 'php artisan serve --host=0.0.0.0 --port=8000', 8000);
        }

        // 3. PHP puro
        if (File::exists("$workspacePath/composer.json") || File::exists("$workspacePath/index.php") || File::exists("$workspacePath/public/index.php")) {
            $docroot = File::isDirectory("$workspacePath/public") ? 'public' : '.';
            return $this->manifest('php', null, 'php:8.4-cli-alpine', null, "php -S 0.0.0.0:8080 -t $docroot", 8080);
        }

        // 4. Go
        if (File::exists("$workspacePath/go.mod")) {
            return $this->manifest('go', null, 'golang:1.22-alpine', null, 'go run .', 8080, ['CGO_ENABLED' => '0']);
        }

        // 5. Python / Django
        if (File::exists("$workspacePath/manage.py")) {
            return $this->manifest('python', 'django', 'python:3.12-alpine', 'pip install -r requirements.txt', 'python manage.py runserver 0.0.0.0:8000', 8000);
        }

        // 6. Python / Flask (ou script simples)
        if (File::exists("$workspacePath/requirements.txt") || File::exists("$workspacePath/app.py") || File::exists("$workspacePath/pyproject.toml")) {
            $install = File::exists("$workspacePath/requirements.txt") ? 'pip install -r requirements.txt' : null;
            return $this->manifest('python', 'flask', 'python:3.12-alpine', $install, 'python app.py', 5000, ['FLASK_RUN_HOST' => '0.0.0.0']);
        }

        // 7. Estático (fallback) — Nginx serve o diretório inteiro.
        return $this->manifest('static', null, 'nginx:alpine', null, '', 80);
    }

    /**
     * Refina a detecção de um projeto Node lendo o package.json.
     */
    private function detectNode(string $workspacePath): array
    {
        $pkg = json_decode(File::get("$workspacePath/package.json"), true) ?: [];
        $deps = array_merge($pkg['dependencies'] ?? [], $pkg['devDependencies'] ?? []);
        $scripts = $pkg['scripts'] ?? [];

        // Escolhe framework e porta padrão.
        if (isset($deps['next'])) {
            $framework = 'next';
            $port = 3000;
        } elseif (isset($deps['vite'])) {
            $framework = 'vite';
            $port = 5173;
        } elseif (isset($deps['react-scripts'])) {
            $framework = 'cra';
            $port = 3000;
        } else {
            $framework = null;
            $scriptName = isset($scripts['dev']) ? 'dev' : (isset($scripts['start']) ? 'start' : 'dev');
            $scriptBody = $scripts[$scriptName] ?? '';
            if (str_contains($scriptBody, 'webpack')) {
                $port = 8080;
            } else {
                $port = 3000;
            }
        }

        // A porta declarada no script (--port N) sempre vence o default do framework.
        $scriptName = isset($scripts['dev']) ? 'dev' : (isset($scripts['start']) ? 'start' : 'dev');
        $scriptBody = $scripts[$scriptName] ?? '';
        if (preg_match('/--port[= ](\d+)/', $scriptBody, $m)) {
            $port = (int) $m[1];
        }

        // Monta o comando de start usando a porta já resolvida (evita divergência host/interna).
        if ($framework === 'vite') {
            $start = "npm run $scriptName -- --host 0.0.0.0 --port $port";
        } elseif ($framework === 'cra') {
            $start = 'npm start';
        } else {
            // Next e projetos genéricos sobem pelo próprio script de dev.
            $start = "npm run $scriptName";
        }

        return $this->manifest('node', $framework, 'node:22-alpine', 'npm install', $start, $port);
    }

    /**
     * Lê o override manual .crom-workspace.json, se existir e for válido.
     */
    private function readOverride(string $workspacePath): ?array
    {
        $file = "$workspacePath/.crom-workspace.json";
        if (!File::exists($file)) {
            return null;
        }

        $data = json_decode(File::get($file), true);
        if (!is_array($data) || empty($data['start']) || empty($data['image'])) {
            return null;
        }

        return [
            'type' => $data['type'] ?? 'custom',
            'framework' => $data['framework'] ?? null,
            'image' => $data['image'],
            'install' => $data['install'] ?? null,
            'start' => $data['start'],
            'internal_port' => (int) ($data['internal_port'] ?? 8080),
            'env' => $data['env'] ?? [],
        ];
    }

    private function manifest(string $type, ?string $framework, string $image, ?string $install, string $start, int $port, array $env = []): array
    {
        return [
            'type' => $type,
            'framework' => $framework,
            'image' => $image,
            'install' => $install,
            'start' => $start,
            'internal_port' => $port,
            'env' => $env,
        ];
    }

    /**
     * Rótulo legível para o frontend, ex: "Node · Vite", "PHP · Laravel".
     */
    public function label(array $manifest): string
    {
        $type = ucfirst($manifest['type']);
        if (!empty($manifest['framework'])) {
            return $type . ' · ' . ucfirst($manifest['framework']);
        }
        return $type;
    }
}
