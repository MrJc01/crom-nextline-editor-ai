<?php

namespace App\Services;

use Illuminate\Support\Facades\File;

/**
 * Gera o scaffold inicial de um workspace de acordo com a stack escolhida na criação.
 * Cada template produz arquivos reais para que o StackDetector reconheça a stack
 * e o DockerService suba o contêiner correto.
 */
class WorkspaceTemplates
{
    public const STACKS = ['static', 'node', 'php', 'go', 'python'];

    /**
     * Escreve os arquivos do template no diretório do workspace.
     */
    public function scaffold(string $dir, string $stack, string $projectName): void
    {
        match ($stack) {
            'node' => $this->node($dir, $projectName),
            'php' => $this->php($dir, $projectName),
            'go' => $this->go($dir, $projectName),
            'python' => $this->python($dir, $projectName),
            default => $this->static($dir, $projectName),
        };
    }

    private function put(string $dir, string $path, string $content): void
    {
        $full = "$dir/$path";
        if (!File::isDirectory(dirname($full))) {
            File::makeDirectory(dirname($full), 0755, true);
        }
        File::put($full, $content);
    }

    private function static(string $dir, string $name): void
    {
        $this->put($dir, 'index.html', $this->staticHtml($name));
    }

    private function node(string $dir, string $name): void
    {
        $slug = $this->slug($name);
        $this->put($dir, 'package.json', json_encode([
            'name' => $slug,
            'private' => true,
            'type' => 'module',
            'scripts' => ['dev' => 'vite --host 0.0.0.0 --port 5173', 'build' => 'vite build'],
            'devDependencies' => ['vite' => '^5.4.0'],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        $this->put($dir, 'index.html', <<<HTML
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{$name}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
HTML);

        $this->put($dir, 'src/main.js', <<<JS
document.querySelector('#app').innerHTML = `
  <main style="font-family: system-ui; text-align:center; padding:80px 20px;">
    <h1>{$name}</h1>
    <p>Projeto Node + Vite rodando em contêiner isolado. Peça mudanças no chat!</p>
  </main>
`
JS);
    }

    private function php(string $dir, string $name): void
    {
        $this->put($dir, 'index.php', <<<PHP
<?php \$name = "{$name}"; ?>
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title><?= htmlspecialchars(\$name) ?></title></head>
<body style="font-family: system-ui; text-align:center; padding:80px 20px;">
  <h1><?= htmlspecialchars(\$name) ?></h1>
  <p>Servido por PHP (<?= PHP_VERSION ?>) em contêiner isolado.</p>
</body>
</html>
PHP);
    }

    private function go(string $dir, string $name): void
    {
        $slug = $this->slug($name);
        $this->put($dir, 'go.mod', "module $slug\n\ngo 1.22\n");
        $this->put($dir, 'main.go', <<<GO
package main

import (
	"html/template"
	"log"
	"net/http"
)

func main() {
	// Serve arquivos estáticos da pasta /static
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		tmpl, err := template.ParseFiles("templates/index.html")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		tmpl.Execute(w, map[string]interface{}{
			"Title": "{$name}",
		})
	})

	log.Println("Server starting on :8080")
	http.ListenAndServe(":8080", nil)
}
GO);
        $this->put($dir, 'templates/index.html', $this->staticHtml($name));
    }

    private function python(string $dir, string $name): void
    {
        $this->put($dir, 'requirements.txt', "flask\n");
        $this->put($dir, 'app.py', <<<PY
from flask import Flask, render_template

app = Flask(__name__, template_folder='templates', static_folder='static')

@app.route("/")
def home():
    return render_template("index.html", title="{$name}")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
PY);
        $this->put($dir, 'templates/index.html', $this->staticHtml($name));
    }

    private function slug(string $name): string
    {
        $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $name));
        return trim($slug, '-') ?: 'workspace';
    }

    private function staticHtml(string $projectName): string
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
  <footer class="border-t border-slate-800/80 bg-slate-950/80 py-8 px-6 text-center text-slate-500 text-xs">
    &copy; 2026 {$name}. Todos os direitos reservados.
  </footer>
</body>
</html>
HTML;
    }
}
