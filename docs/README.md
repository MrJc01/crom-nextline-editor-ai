# Documentação do Projeto Crom Nextline Editor

Bem-vindo à documentação oficial do **Crom Nextline Editor**. Este projeto visa criar um sistema de edição de sites em tempo real assistido por inteligência artificial local (através do ecossistema `crom-agente`).

Abaixo estão os documentos detalhados que descrevem cada parte do sistema:

## Índice de Documentos

1. **[Arquitetura do Sistema](architecture.md)**
   - Detalha a stack tecnológica (React/TS, Laravel, Go) e o fluxo de comunicação entre as partes via APIs e WebSockets.
2. **[Integração com Crom Agente](cli-go-integration.md)**
   - Explica como o binário CLI em Go se conecta ao `crom-agente` e `crom-agente-sdk`, e como o Laravel orquestra essas chamadas.
3. **[Guia do Docker e Containerização](docker.md)**
   - Demonstra a configuração do ambiente multi-container usando Docker e Docker Compose para subir todo o sistema facilmente.
4. **[Roadmap do Sistema](roadmap.md)**
   - Detalha as rotas da API backend, o roteamento frontend e o diagrama de sequência do ciclo de vida das requisições.
5. **[Checklist e Cronograma de Desenvolvimento](checklist.md)**
   - Um acompanhamento do progresso das tarefas de desenvolvimento separadas por etapas.

---

## Estrutura do Repositório

```text
crom-nextline-editor-ai/
├── backend/            # API Laravel (Backend)
├── frontend/           # Aplicação React + Vite + Tailwind (Frontend)
├── cli/                # Código fonte do Wrapper CLI em Go
├── docs/               # Arquivos de documentação (Markdown)
└── docker-compose.yml  # Orquestração local em contêineres Docker
```
