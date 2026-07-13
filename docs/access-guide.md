# Guia de Acesso e Perfis do Sistema

Este documento descreve como acessar a plataforma **Crom Nextline Editor AI**, detalhando as credenciais de acesso, os perfis disponíveis (Administrador vs. Cliente) e o funcionamento do sistema de crédito de pontos.

---

## 🔑 Credenciais e Endereços de Acesso

Ao inicializar a stack local via Docker ou comando direto, os seguintes endereços ficam disponíveis:

- **Frontend SPA (Vite):** [http://localhost:5173](http://localhost:5173)
- **Backend API (Laravel):** [http://localhost:8000](http://localhost:8000)

### 👤 Usuários de Teste Iniciais

Utilize as seguintes contas e credenciais padrão para acessar e testar o sistema localmente:

* **Administrador (Painel Admin & Configurações)**
  - **E-mail:** `admin@crom.run`
  - **Senha:** `password`
  - **Função:** Controlar chaves API do OpenRouter, definir custos de processamento e monitorar contêineres Docker.

* **Cliente de Teste (Editor de Workspaces)**
  - **E-mail:** `client@crom.run`
  - **ID no Banco de Dados:** `11111111-1111-1111-1111-111111111111`
  - **Saldo Inicial:** `500 pontos` (cada alteração desconta os pontos do saldo deste cliente).

### Perfis de Acesso

O login simula dois fluxos operacionais principais dependendo do endereço que você acessa ou da conta logada:

#### 1. Perfil do Administrador
- **Link de Acesso:** Navegue para `/admin` ou clique no botão **Admin** na barra superior após efetuar o login.
- **Funções:**
  - Configuração global da chave API do **OpenRouter** (salva diretamente no banco de dados e propagada de forma limpa como variável de ambiente no processo da CLI Go).
  - Definição do custo de pontos por solicitação do agente (padrão: `10 pts`).
  - Monitor de contêineres Docker do preview em tempo real (mostrando quais portas dinâmicas estão ativas).
  - Listagem de clientes com concessão direta de novos créditos de pontos.

#### 2. Perfil do Cliente
- **E-mail de Login padrão:** `admin@crom.run` (ou qualquer e-mail no formulário de login).
- **Saldo Inicial:** Cada cliente novo inicia com **500 pontos** de crédito por padrão.
- **Funções:**
  - Acesso ao **Painel Editor** (`/dashboard`).
  - Criação de novos projetos isolados (workspaces).
  - Controle de ciclo de vida (`Play` / `Stop`) do contêiner Docker Nginx exclusivo do projeto.
  - Chat interativo para pedir modificações de design na página. Cada alteração bem-sucedida consome os pontos do saldo atual do cliente de acordo com a taxa configurada.
  - Caso o saldo chegue a zero ou fique abaixo do custo, o sistema bloqueia novas edições exibindo um alerta amigável de saldo insuficiente.

---

## ⚙️ Configuração da OpenRouter API Key

O binário do Go (`crom-cli`) e o agente requerem comunicação com modelos de linguagem. Há duas formas suportadas para configurar a API Key:

1. **Arquivo local `.env`:** Criar um arquivo `.env` na raiz do projeto contendo:
   ```env
   OPENROUTER_API_KEY=sua_chave_aqui
   ```
2. **Painel do Administrador:** Salvar a chave na tela de Admin em [http://localhost:5173/admin](http://localhost:5173/admin). O Laravel lerá do banco de dados e alimentará o processo local de forma automática.
