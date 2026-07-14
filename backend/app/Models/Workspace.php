<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Workspace extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'user_id',
        'name',
        'stack',
        'framework',
        'port',
        'internal_port',
        'status',
        'container_id',
        'health',
        'preview_url',
        'last_error',
        'path',
        'slug',
    ];

    protected $casts = [
        'port' => 'integer',
        'internal_port' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Caminho do workspace acessível DENTRO do contêiner do backend.
     *
     * Atenção: a coluna `path` guarda o caminho NO HOST (usado nos volumes -v do
     * docker run). Para ler arquivos aqui dentro do contêiner é preciso usar este
     * caminho local.
     *
     * Isolamento: novos workspaces vivem em storage/app/workspaces (fora do alcance
     * do Vite). Workspaces legados ainda em frontend/public continuam sendo resolvidos.
     */
    public function localPath(): string
    {
        $storage = storage_path('app/workspaces/' . $this->id);
        if (is_dir($storage)) {
            return $storage;
        }
        // Fallback para o local legado (workspaces criados antes do isolamento).
        return base_path('../frontend/public/preview-site/workspaces/' . $this->id);
    }

    /** Diretório base (local) onde novos workspaces são criados. */
    public static function storageBase(): string
    {
        return storage_path('app/workspaces');
    }

    /**
     * Retorna a URL de preview de acordo com o modo configurado em .env.
     */
    public function getPreviewUrlAttribute($value)
    {
        $type = env('PREVIEW_URL_TYPE', 'port');
        $baseUrl = env('PREVIEW_BASE_URL', 'http://localhost:8000');

        if ($type === 'subdomain') {
            $host = parse_url($baseUrl, PHP_URL_HOST);
            $scheme = parse_url($baseUrl, PHP_URL_SCHEME) ?? 'http';
            $port = parse_url($baseUrl, PHP_URL_PORT);
            $portSuffix = $port ? ':' . $port : '';
            return $scheme . '://' . ($this->slug ?? \Illuminate\Support\Str::slug($this->name)) . '.' . $host . $portSuffix;
        } elseif ($type === 'path') {
            if ($this->stack === 'static') {
                return rtrim($baseUrl, '/') . '/preview/' . ($this->slug ?? \Illuminate\Support\Str::slug($this->name));
            }
            return 'http://localhost:' . $this->port;
        }

        return 'http://localhost:' . $this->port;
    }
}
