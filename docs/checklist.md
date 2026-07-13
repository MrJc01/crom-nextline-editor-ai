# Checklist de Desenvolvimento

Este documento descreve o plano de tarefas detalhado para o desenvolvimento do **Crom Nextline Editor AI**, separado em etapas lógicas.

---

## 📅 Etapas de Implementação

### Etapa 1: Setup Inicial do Repositório 🟢 (Concluído)
- [x] Definir e criar a estrutura de diretórios (`frontend`, `backend`, `cli`, `docs`).
- [x] Criar documentação inicial de arquitetura.
- [x] Adicionar o `README.md` principal na raiz.

### Etapa 2: Configuração do Frontend 🟢 (Concluído)
- [x] Scaffold da aplicação Vite + React + TypeScript no diretório `frontend`.
- [x] Instalação e configuração do Tailwind CSS v4 (usando `@tailwindcss/vite`).
- [x] Criação de layout rico e interativo com chat, visualizador de logs e simulador de iframe.
- [x] Remoção de dependências e arquivos não utilizados.
- [x] Dockerfile de desenvolvimento para o frontend.

### Etapa 3: Configuração do Backend (Laravel 11) 🟡 (Em progresso)
- [x] Scaffold inicial do Laravel 11 na pasta `backend` via contêiner do Composer.
- [ ] Criar rotas da API no Laravel (`/api/command` para receber a entrada do chat).
- [ ] Desenvolver o Controller no Laravel para orquestrar e disparar a execução do binário Go CLI.
- [ ] Configurar conexão WebSocket ou SSE (Server-Sent Events) simples para enviar atualizações (HMR) ao frontend.
- [ ] Dockerfile de desenvolvimento para o backend PHP/Laravel.

### Etapa 4: Criação do Wrapper CLI em Go 🔴 (A fazer)
- [ ] Inicializar o módulo Go em `cli/`.
- [ ] Integrar com as bibliotecas `crom-agente` e `crom-agente-sdk` (via APIs ou chamadas do SDK).
- [ ] Implementar comandos básicos de CLI para ler/escrever arquivos com base nos prompts da IA.
- [ ] Testar a compilação do binário estático executável.

### Etapa 5: Dockerização e Orquestração Completa 🔴 (A fazer)
- [ ] Criar o `docker-compose.yml` na raiz do projeto.
- [ ] Mapear volumes de desenvolvimento para hot-reload sincronizado no host.
- [ ] Testar a comunicação de contêineres (`frontend` enviando requisições para `backend` e `backend` executando o binário Go CLI).

### Etapa 6: Integração Final e Fluxo do Iframe 🔴 (A fazer)
- [ ] Fazer o iframe do frontend carregar o projeto web editável de verdade.
- [ ] Integrar o chat do frontend com a API do Laravel para modificar arquivos do projeto web.
- [ ] Validar o fluxo ponta a ponta: Prompt do chat -> Laravel -> Go CLI -> Crom Agente -> Modifica site no disco -> Iframe recarrega via WebSocket.
