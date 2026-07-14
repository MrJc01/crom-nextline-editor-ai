# Detecção Automática de Stack

Este documento descreve como o **Crom Nextline Editor** decide qual runtime um workspace precisa e, a partir disso, qual imagem Docker subir, qual comando de instalação rodar e em qual porta interna o app escuta.

A responsabilidade fica no serviço `App\Services\StackDetector`, chamado na criação do workspace e sempre que o servidor é ligado (o resultado é cacheado na coluna `stack` da tabela `workspaces`).

---

## 🎯 Problema que resolve

Antes, o `WorkspaceController::start()` sempre executava `nginx:alpine` — ou seja, o sistema **só sabia servir HTML estático**. Um projeto Node, PHP, Go ou Python nunca subiria corretamente.

A detecção olha os arquivos do projeto (o "manifesto" da linguagem) e produz um objeto normalizado:

```json
{
  "type": "node",
  "framework": "vite",
  "image": "node:22-alpine",
  "install": "npm install",
  "start": "npm run dev -- --host 0.0.0.0 --port 5173",
  "internal_port": 5173,
  "env": {}
}
```

---

## 🔍 Regras de detecção (ordem de prioridade)

A detecção é feita de cima para baixo; o **primeiro** match vence. Um arquivo `.crom-workspace.json` no root do projeto sobrescreve tudo (override manual).

| Ordem | Stack | Sinais no diretório | Imagem base | Porta interna | Comando de start |
| :---: | :--- | :--- | :--- | :---: | :--- |
| 0 | **override** | `.crom-workspace.json` | (do arquivo) | (do arquivo) | (do arquivo) |
| 1 | **Node** | `package.json` | `node:22-alpine` | 5173 / do script | `npm run dev` (ou `start`) |
| 2 | **PHP/Laravel** | `artisan` + `composer.json` | `php:8.4-cli-alpine` | 8000 | `php artisan serve --host=0.0.0.0` |
| 3 | **PHP puro** | `composer.json` ou `index.php` | `php:8.4-cli-alpine` | 8080 | `php -S 0.0.0.0:8080 -t public` |
| 4 | **Go** | `go.mod` | `golang:1.22-alpine` | 8080 | `go run .` |
| 5 | **Python/Django** | `manage.py` | `python:3.12-alpine` | 8000 | `python manage.py runserver 0.0.0.0:8000` |
| 6 | **Python/Flask** | `requirements.txt` + `app.py` | `python:3.12-alpine` | 5000 | `python app.py` |
| 7 | **Estático** (fallback) | apenas `index.html` | `nginx:alpine` | 80 | (Nginx serve `/usr/share/nginx/html`) |

### Detalhamento do Node

Dentro de um projeto Node, olhamos `package.json` para refinar:
- `dependencies.vite` ou `devDependencies.vite` → framework **Vite**, porta 5173.
- `dependencies.next` → framework **Next.js**, porta 3000, comando `npm run dev`.
- `dependencies.react-scripts` → **CRA**, porta 3000, `npm start`.
- Caso contrário, usamos `scripts.dev` se existir, senão `scripts.start`.

A porta interna também é lida de `--port N` no script, quando presente.

---

## 🧩 Override manual (`.crom-workspace.json`)

Para projetos com configuração fora do padrão, o usuário pode versionar um arquivo na raiz do workspace:

```json
{
  "type": "node",
  "image": "node:20-alpine",
  "install": "pnpm install",
  "start": "pnpm dev --host 0.0.0.0 --port 4000",
  "internal_port": 4000,
  "env": { "NODE_ENV": "development" }
}
```

Quando presente, ele tem prioridade máxima e a detecção automática é ignorada.

---

## 🔗 Como o resultado é usado

1. **Criação do workspace** — o `manifest` é detectado e a coluna `stack` é preenchida.
2. **Start** — o `DockerService` usa `image`, `install`, `start` e `internal_port` do manifest para montar o `docker run` correto (veja [workspaces-docker.md](./workspaces-docker.md)).
3. **Preview** — a porta do host mapeada para `internal_port` compõe a `preview_url` retornada ao frontend.

---

## ✅ Cobertura de testes

Cada regra tem um fixture correspondente em `backend/tests/Feature/StackDetectorTest.php`, com um diretório mínimo de exemplo por stack, garantindo que a detecção não regrida quando novas regras forem adicionadas.
