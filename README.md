# Crom Nextline Editor AI

O **Crom Nextline Editor AI** é uma plataforma de edição e prototipação de sites em tempo real guiada por IA local. Com uma interface split-screen dividida, você pode dar instruções a um agente inteligente via chat e visualizar o design e o código do site sendo modificados instantaneamente em um iframe.

Cada projeto vive em um **workspace isolado** que sobe em seu próprio contêiner Docker. O sistema **detecta a stack** (Node, PHP, Go, Python ou site estático) a partir dos arquivos e sobe a imagem correta automaticamente — ver [docs/stack-detection.md](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/stack-detection.md).

Este projeto faz parte do ecossistema de soberania digital **CROM** (incluindo `crom-agente` e `crom-agente-sdk`).

> **Nota de setup:** o backend cria contêineres de preview via socket do Docker, então o contêiner do backend precisa do cliente `docker` (já no [Dockerfile](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/backend/Dockerfile)) e da variável `HOST_PROJECT_PATH` no `.env` do backend. Detalhes em [docs/docker.md](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/docker.md).

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** TypeScript, React (Vite) e Tailwind CSS v4.
- **Backend:** PHP 8.3 e Laravel 11.
- **CLI / Orquestrador:** Go wrapper (`crom-cli`) que consome o SDK do `crom-agente`.
- **Infraestrutura:** Docker e Docker Compose para inicialização rápida.

---

## 📂 Estrutura do Projeto

```text
├── backend/            # API REST em Laravel (Backend)
├── frontend/           # Aplicação SPA React + Tailwind v4 (Frontend)
├── cli/                # Código fonte e binário do wrapper CLI em Go
├── docs/               # Documentação detalhada em Markdown
│   ├── architecture.md # Detalhamento da arquitetura do sistema
│   ├── roadmap.md      # Roadmap, diagramas e APIs do sistema
│   ├── checklist.md    # Checklist e cronograma de tarefas
│   ├── docker.md       # Instruções para rodar no Docker
│   └── cli-go-integration.md # Funcionamento do Wrapper Go CLI
└── docker-compose.yml  # Orquestração local em Docker
```

---

## 🐳 Como Subir com Docker (Rápido)

Para rodar o projeto inteiro (frontend e backend) localmente de forma isolada, execute o Docker Compose na raiz do repositório:

```bash
docker compose up --build
```

Acesse no seu navegador:
- **Frontend SPA:** `http://localhost:5173`
- **Backend API:** `http://localhost:8000`

### 👤 Credenciais de Teste Iniciais
* **Cliente:** `client@crom.run` / `password`
* **Administrador:** `admin@crom.run` / `password`

---

## 🧪 Como Executar a Suíte de Testes
Temos uma suíte robusta de 27 testes automatizados validando toda a aplicação:
- **Backend (Laravel):** `docker exec crom-backend-srv php artisan test`
- **Frontend (Vitest):** `cd frontend && npx vitest run src/tests/frontend.test.ts`
- **Go CLI:** `cd cli && go test -v`
- **E2E Playwright:** `cd frontend && npx playwright test`

---

## 📚 Documentação Adicional

Para mais detalhes sobre as regras de negócio e infraestrutura, veja a pasta [/docs](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs):
- [README Geral da Pasta Docs](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/README.md)
- [Arquitetura Geral](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/architecture.md)
- [Multi-Workspaces e Dockerização Dinâmica](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/workspaces-docker.md)
- [Guia de Acesso e Login](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/access-guide.md)
- [Guia de Testes Automatizados](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/tests-guide.md)
- [Detecção Automática de Stacks](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/stack-detection.md)
- [Roadmap do Sistema e APIs](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/roadmap.md)
- [Checklist de Desenvolvimento](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/checklist.md)
- [Funcionamento do Go CLI & SDK](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/cli-go-integration.md)
- [Guia Docker Completo](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/docker.md)
