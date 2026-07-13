# Crom Nextline Editor AI

O **Crom Nextline Editor AI** é uma plataforma de edição e prototipação de sites em tempo real guiada por IA local. Com uma interface split-screen dividida, você pode dar instruções a um agente inteligente via chat e visualizar o design e o código do site sendo modificados instantaneamente em um iframe.

Este projeto faz parte do ecossistema de soberania digital **CROM** (incluindo `crom-agente` e `crom-agente-sdk`).

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

Para rodar o projeto inteiro (frontend e backend) localmente de forma isolada, basta executar o Docker Compose na raiz do repositório:

```bash
docker compose up --build
```

Acesse no seu navegador:
- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:8000`

---

## 📚 Documentação Adicional

Para mais detalhes sobre as regras de negócio e infraestrutura, veja a pasta [/docs](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs):
- [Arquitetura Geral](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/architecture.md)
- [Roadmap do Sistema e APIs](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/roadmap.md)
- [Checklist de Desenvolvimento](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/checklist.md)
- [Funcionamento do Go CLI & SDK](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/cli-go-integration.md)
- [Guia Docker Completo](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/docker.md)
