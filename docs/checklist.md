# Checklist de Desenvolvimento

Este documento apresenta o plano detalhado de implementação do **Crom Nextline Editor AI**, estruturado por componentes e etapas, permitindo acompanhar o progresso real do desenvolvimento.

---

## 📊 Progresso por Etapas

### Etapa 1: Setup Inicial do Repositório 🟢 (100% Concluído)
- [x] Criar estrutura básica de diretórios (`/frontend`, `/backend`, `/cli`, `/docs`).
- [x] Criar documentação técnica inicial:
  - [x] [README.md principal da raiz](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/README.md)
  - [x] [docs/README.md (Index)](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/README.md)
  - [x] [docs/architecture.md (Arquitetura)](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/architecture.md)
  - [x] [docs/docker.md (Guia Docker)](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/docs/docker.md)

---

### Etapa 2: Setup e UI do Frontend 🟢 (100% Concluído)
- [x] Inicializar projeto SPA usando Vite + React + TypeScript em `/frontend`.
- [x] Configurar o Tailwind CSS v4 via `@tailwindcss/vite` e limpar o arquivo de estilos global [index.css](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/frontend/src/index.css).
- [x] Desenvolver a interface visual premium no [App.tsx](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/frontend/src/App.tsx) contendo:
  - [x] Chat de Comando com IA lateral (com histórico de mensagens e sugestões rápidas).
  - [x] Visualizador de logs de terminal simulados para monitoramento do Laravel e Go CLI.
  - [x] Visualizador do código fonte alterado em tempo real com árvore de arquivos.
  - [x] Canvas em split-screen (`iframe`) com simulação de layout de dispositivo responsivo (Desktop, Tablet e Mobile).
- [x] Criar o [Dockerfile do Frontend](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/frontend/Dockerfile) para desenvolvimento local em contêiner.
- [x] Validar que o build de produção está livre de erros (`npm run build`).

---

### Etapa 3: Estrutura do Backend (Laravel 11) 🟡 (50% Concluído)
- [x] Criar o scaffold limpo do Laravel 11 no diretório `/backend` via Docker.
- [x] Executar migrations do banco de dados inicial (SQLite).
- [x] Habilitar e publicar o suporte a API Routes e CORS:
  - [x] Criado o arquivo de rotas [routes/api.php](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/backend/routes/api.php).
  - [x] Habilitadas configurações globais de CORS no [config/cors.php](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/backend/config/cors.php) permitindo comunicação com a porta do Vite.
  - [x] Configurado o [bootstrap/app.php](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/backend/bootstrap/app.php) para responder JSON em exceções na API.
- [ ] Criar rotas da API:
  - [ ] Rota `POST /api/command` no Laravel para receber o prompt do usuário enviado pelo chat.
- [ ] Criar o Controller Laravel:
  - [ ] Implementar chamada assíncrona ao wrapper nativo do Go (`crom-cli`) usando o componente Symfony Process do Laravel.
- [ ] Configurar mecanismo de Hot Reload / SSE (Server-Sent Events) no Laravel para emitir sinais de recarregamento para o Iframe.

---

### Etapa 4: CLI Wrapper em Go (`cli/crom-cli`) 🔴 (A Fazer)
- [ ] Inicializar o módulo Go em `/cli` (`go mod init crom-cli`).
- [ ] Adicionar e integrar as dependências do `crom-agente` e seu SDK (`crom-agente-sdk`).
- [ ] Criar parser de argumentos CLI (`--action`, `--prompt`, `--path`) para receber instruções do Laravel.
- [ ] Implementar a lógica para invocar o Crom Agente, atualizar os arquivos locais do site e gerar resposta legível (JSON) para o Laravel.
- [ ] Escrever script de compilação ou automatização do build do binário em Go.

---

### Etapa 5: Orquestração Multi-Container (Docker Compose) 🟡 (10% Concluído)
- [x] Criado o Dockerfile do frontend.
- [ ] Criar o Dockerfile para o backend (PHP 8.3 + FPM ou PHP CLI para desenvolvimento).
- [ ] Escrever o `docker-compose.yml` na raiz do projeto contendo os serviços `frontend` e `backend`.
- [ ] Configurar volumes compartilhados entre os contêineres para que as alterações feitas pela CLI Go no backend reflitam imediatamente na pasta de arquivos lida pelo visualizador do frontend.

---

### Etapa 6: Homologação e Testes de Integração 🔴 (A Fazer)
- [ ] Testar subida limpa do ambiente via `docker compose up --build`.
- [ ] Realizar teste ponta a ponta:
  1. Digitar instrução no chat (Frontend).
  2. Receber chamada na rota `/api/command` (Laravel).
  3. Executar o binário Go wrapper que ativa o Crom Agente (CLI).
  4. Crom Agente edita os arquivos do site no disco (Workspace).
  5. Laravel emite sinal de reload (WebSocket/SSE).
  6. Iframe recarrega mostrando a nova alteração no design (Frontend).
