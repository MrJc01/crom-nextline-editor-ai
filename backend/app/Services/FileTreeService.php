<?php

namespace App\Services;

/**
 * Varre o diretório de um workspace e devolve a árvore de arquivos, além de
 * ler o conteúdo de um arquivo individual com proteção contra path traversal.
 */
class FileTreeService
{
    /** Diretórios ignorados na varredura. */
    private const IGNORE = ['node_modules', 'vendor', '.git', 'dist', 'build', '.next', '__pycache__', '.cache'];

    /** Limite de leitura de um arquivo (bytes). */
    private const MAX_FILE = 512 * 1024;

    /** Extensões tratadas como texto editável. */
    private const TEXT_EXT = [
        'html', 'htm', 'css', 'scss', 'js', 'jsx', 'ts', 'tsx', 'json', 'md', 'txt',
        'php', 'go', 'py', 'rb', 'java', 'yml', 'yaml', 'xml', 'svg', 'env', 'sh',
        'vue', 'toml', 'ini', 'conf', 'lock', 'gitignore',
    ];

    /**
     * Árvore recursiva do workspace: [{ name, path, type, children? }].
     */
    public function tree(string $root): array
    {
        if (!is_dir($root)) {
            return [];
        }
        return $this->scan($root, '');
    }

    private function scan(string $root, string $rel): array
    {
        $abs = $rel === '' ? $root : $root . '/' . $rel;
        $entries = @scandir($abs) ?: [];
        $dirs = [];
        $files = [];

        foreach ($entries as $entry) {
            if ($entry === '.' || $entry === '..' || in_array($entry, self::IGNORE, true)) {
                continue;
            }
            $childRel = $rel === '' ? $entry : "$rel/$entry";
            if (is_dir("$root/$childRel")) {
                $dirs[] = [
                    'name' => $entry,
                    'path' => $childRel,
                    'type' => 'dir',
                    'children' => $this->scan($root, $childRel),
                ];
            } else {
                $files[] = [
                    'name' => $entry,
                    'path' => $childRel,
                    'type' => 'file',
                    'lang' => $this->langOf($entry),
                ];
            }
        }

        // Pastas primeiro, cada grupo em ordem alfabética.
        usort($dirs, fn ($a, $b) => strcasecmp($a['name'], $b['name']));
        usort($files, fn ($a, $b) => strcasecmp($a['name'], $b['name']));
        return array_merge($dirs, $files);
    }

    /**
     * Lê o conteúdo de um arquivo, validando que ele está dentro do root.
     *
     * @return array{ok:bool,content?:string,lang?:string,error?:string}
     */
    public function read(string $root, string $relPath): array
    {
        $resolved = $this->safeResolve($root, $relPath);
        if ($resolved === null) {
            return ['ok' => false, 'error' => 'Caminho inválido.'];
        }
        if (!is_file($resolved)) {
            return ['ok' => false, 'error' => 'Arquivo não encontrado.'];
        }
        if (filesize($resolved) > self::MAX_FILE) {
            return ['ok' => false, 'error' => 'Arquivo grande demais para exibir.'];
        }

        $content = file_get_contents($resolved);
        if ($content !== '' && !mb_check_encoding($content, 'UTF-8')) {
            return ['ok' => false, 'error' => 'Arquivo binário não pode ser exibido.'];
        }

        return ['ok' => true, 'content' => $content, 'lang' => $this->langOf($resolved)];
    }

    /**
     * Grava conteúdo em um arquivo dentro do root (edição manual).
     *
     * @return array{ok:bool,error?:string}
     */
    public function write(string $root, string $relPath, string $content): array
    {
        $resolved = $this->safeResolve($root, $relPath);
        if ($resolved === null) {
            return ['ok' => false, 'error' => 'Caminho inválido.'];
        }
        if (!is_dir(dirname($resolved))) {
            @mkdir(dirname($resolved), 0755, true);
        }
        file_put_contents($resolved, $content);
        return ['ok' => true];
    }

    /**
     * Cria um arquivo (vazio) ou diretório dentro do root.
     *
     * @return array{ok:bool,error?:string}
     */
    public function create(string $root, string $relPath, bool $isDir): array
    {
        $resolved = $this->safeResolve($root, $relPath);
        if ($resolved === null) {
            return ['ok' => false, 'error' => 'Caminho inválido.'];
        }
        if (file_exists($resolved)) {
            return ['ok' => false, 'error' => 'Já existe um arquivo ou pasta com esse nome.'];
        }
        if ($isDir) {
            @mkdir($resolved, 0755, true);
        } else {
            if (!is_dir(dirname($resolved))) {
                @mkdir(dirname($resolved), 0755, true);
            }
            file_put_contents($resolved, '');
        }
        return ['ok' => true];
    }

    /**
     * Renomeia/move um arquivo ou pasta dentro do root.
     *
     * @return array{ok:bool,error?:string}
     */
    public function rename(string $root, string $from, string $to): array
    {
        $src = $this->safeResolve($root, $from);
        $dst = $this->safeResolve($root, $to);
        if ($src === null || $dst === null) {
            return ['ok' => false, 'error' => 'Caminho inválido.'];
        }
        if (!file_exists($src)) {
            return ['ok' => false, 'error' => 'Origem não encontrada.'];
        }
        if (file_exists($dst)) {
            return ['ok' => false, 'error' => 'Destino já existe.'];
        }
        if (!is_dir(dirname($dst))) {
            @mkdir(dirname($dst), 0755, true);
        }
        return @rename($src, $dst) ? ['ok' => true] : ['ok' => false, 'error' => 'Falha ao renomear.'];
    }

    /**
     * Remove um arquivo ou pasta (recursivamente) dentro do root.
     *
     * @return array{ok:bool,error?:string}
     */
    public function delete(string $root, string $relPath): array
    {
        $resolved = $this->safeResolve($root, $relPath);
        // Nunca permite apagar a própria raiz.
        if ($resolved === null || $resolved === realpath($root)) {
            return ['ok' => false, 'error' => 'Caminho inválido.'];
        }
        if (!file_exists($resolved)) {
            return ['ok' => false, 'error' => 'Arquivo não encontrado.'];
        }
        is_dir($resolved) ? $this->rrmdir($resolved) : @unlink($resolved);
        return ['ok' => true];
    }

    private function rrmdir(string $dir): void
    {
        foreach (scandir($dir) ?: [] as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = "$dir/$item";
            is_dir($path) ? $this->rrmdir($path) : @unlink($path);
        }
        @rmdir($dir);
    }

    /**
     * Resolve o caminho relativo de forma segura, garantindo que ele permaneça
     * dentro do root (bloqueia ../ e caminhos absolutos).
     */
    private function safeResolve(string $root, string $relPath): ?string
    {
        $rootReal = realpath($root);
        if ($rootReal === false) {
            return null;
        }

        $relPath = str_replace('\\', '/', $relPath);
        $relPath = ltrim($relPath, '/');
        $target = $rootReal . '/' . $relPath;

        // Normaliza o caminho manualmente (o arquivo pode ainda não existir, então realpath falharia).
        $parts = [];
        foreach (explode('/', $target) as $seg) {
            if ($seg === '' || $seg === '.') {
                continue;
            }
            if ($seg === '..') {
                array_pop($parts);
                continue;
            }
            $parts[] = $seg;
        }
        $normalized = '/' . implode('/', $parts);

        // Precisa continuar sob o root.
        if ($normalized !== $rootReal && !str_starts_with($normalized, $rootReal . '/')) {
            return null;
        }
        return $normalized;
    }

    private function langOf(string $path): string
    {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        return in_array($ext, self::TEXT_EXT, true) ? ($ext ?: 'text') : 'text';
    }
}
