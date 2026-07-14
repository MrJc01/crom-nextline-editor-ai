# Arquitetura e Fluxo do Sistema Crom Nextline Editor AI

Este documento detalha o funcionamento interno de toda a plataforma, cobrindo o fluxo de autenticação e autorização (Sanctum), a cadeia de execução de comandos via CLI Go integrado à IA, e o ciclo de vida dos contêineres Docker isolados.

---

## 🔐 1. Fluxo de Autenticação e Segurança (Sanctum & Roles)

O sistema utiliza o Laravel Sanctum para emissão de tokens API protegidos e controle de acesso baseado em papéis (`admin` vs `client`).

```mermaid
graph TD
    User([Usuário]) -->|1. Envia Credenciais| LoginPage[SPA React /login]
    LoginPage -->|2. POST /api/login| API_Login[Laravel AuthController]
    API_Login -->|3. Valida no SQLite| DB[(Banco SQLite)]
    DB -->|Retorna Usuário| API_Login
    API_Login -->|4. Retorna Token + Role| LoginPage
    LoginPage -->|5. Salva Token| LS[(LocalStorage)]
    
    subgraph Chamadas Protegidas
        ReactApp[Componentes React] -->|6. API Request| APIWrapper[Wrapper: fetchWithAuth]
        LS -->|Lê Token| APIWrapper
        APIWrapper -->|7. Request com Bearer Token| LaravelAPI[Laravel Kernel & Middleware]
        LaravelAPI -->|8. Valida Token| Sanctum[Sanctum Authenticate]
        Sanctum -->|9. Autorizado| RouteHandler[Controller / WorkspaceOwner]
        RouteHandler -->|10. Valida Permissão / ID| AccessCheck{Dono do Workspace ou Admin?}
        AccessCheck -->|Sim| ReturnData[Retorna Dados / Executa Comando]
        AccessCheck -->|Não| BlockAccess[HTTP 403 Forbidden]
    end
```

---

## ⚙️ 2. Pipeline de Execução de Comandos (O Agente de IA)

O fluxo a seguir ilustra o que ocorre quando o cliente digita um prompt no chat do editor para modificar o site.

```mermaid
graph TD
    ClientPrompt([Cliente envia Prompt]) -->|1. POST /api/command| AgentController[Laravel AgentController]
    AgentController -->|2. Valida Créditos| ClientPoints{Cliente tem pontos >= custo?}
    
    ClientPoints -->|Não| ErrorPoints[Retorna HTTP 403 / Saldo Insuficiente]
    
    ClientPoints -->|Sim| ResolveKey[Busca API Key do Admin]
    ResolveKey -->|3. Invoca CLI em Processo Isolado| SymfonyProc[Processo Symfony: crom-cli]
    
    subgraph CLI Go
        SymfonyProc -->|4. Executa crom-cli| CLI_Go[crom-cli Executável Estático CGO_ENABLED=0]
        CLI_Go -->|5. Escaneia Arquivos| ScanFs[Lê árvore do Workspace]
        CLI_Go -->|6. Checa Conectividade| CheckDaemon{Daemon WebSocket Online?}
        
        CheckDaemon -->|Sim| RunDaemon[Envia tarefa via WebSocket para o Agente local]
        
        CheckDaemon -->|Não / Fallback| CheckAPIKey{Existe Chave OpenRouter?}
        
        CheckAPIKey -->|Sim| CallOpenRouter[Chama API OpenRouter com Prompt + Arquivos]
        CallOpenRouter -->|7. Retorna JSON de Operações| ApplyOps[Aplica Alterações nos Arquivos do Workspace]
        
        CheckAPIKey -->|Não| FallbackLocal[Aplica regras estáticas básicas no index.html]
    end
    
    ApplyOps -->|8. Retorna JSON de Sucesso| SymfonyProc
    FallbackLocal -->|8. Retorna JSON de Sucesso| SymfonyProc
    RunDaemon -->|8. Retorna JSON de Sucesso| SymfonyProc
    
    SymfonyProc -->|9. Sucesso| BilledCheck{Usuário é Admin?}
    BilledCheck -->|Não| DeductPoints[Decrementa Pontos do Cliente]
    BilledCheck -->|Sim| SaveState[Mantém Pontos]
    
    DeductPoints -->|10. Retorna Resposta| Frontend[React SPA: Exibe Logs e Recarrega Preview]
    SaveState -->|10. Retorna Resposta| Frontend
```

---

## 🐳 3. Ciclo de Vida do Contêiner de Preview (Docker)

Cada workspace possui seu próprio ciclo de vida Docker isolado para rodar e visualizar o site em tempo real.

```mermaid
graph TD
    UserAction([Ação do Usuário]) -->|Start/Stop Preview| SPA[React SPA]
    SPA -->|POST /api/workspaces/id/start| WorkController[WorkspaceController]
    
    subgraph Docker Backend srv
        WorkController -->|1. Invoca| DockerService[DockerService]
        DockerService -->|2. Analisa Arquivos| StackDetector[StackDetector]
        StackDetector -->|3. Identifica Framework| Detection{Stack Detectada?}
        
        Detection -->|Estática| ConfigStatic[Nginx Alpine + ro volume]
        Detection -->|Node / Python / Go / PHP| ConfigDynamic[Image específica + build shell + internal port]
        
        ConfigStatic -->|4. Inicia Contêiner| DockerRun[docker run -d -p PORT:80 -v host:nginx:ro]
        ConfigDynamic -->|4. Inicia Contêiner| DockerRun2[docker run -d -p PORT:internal_port -v host:app]
        
        DockerRun -->|5. Reconcilia| DBUpdate[Salva container_id e marca como starting]
        DockerRun2 -->|5. Reconcilia| DBUpdate
        
        DBUpdate -->|6. Aguarda Grace Period| Sleep[Sleep 3 segundos]
        Sleep -->|7. Checa Health status| Healthy{Contêiner Rodando?}
        Healthy -->|Sim| SetRunning[Status: running / health: healthy]
        Healthy -->|Não| ReadLogs[Captura logs de erro do contêiner e marca health: exited]
    end
    
    SetRunning -->|8. Atualiza UI| SPA
    ReadLogs -->|8. Mostra logs de erro| SPA
```

---

## 🌐 4. Roteamento de Previews por URL Amigável / Subdomínio

O sistema permite configurar de maneira extremamente flexível a forma como os previews dos workspaces são acessados na plataforma, através de duas variáveis de ambiente no arquivo [backend/.env](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/backend/.env):

```env
# Tipo de URL de preview: 'port' (legado via porta dedicada), 'path' (URL amigável por pasta) ou 'subdomain' (por subdomínio)
PREVIEW_URL_TYPE=path
# URL base do servidor Laravel para servir os arquivos estáticos dos previews
PREVIEW_BASE_URL=http://localhost:8000
```

### Funcionamento do Slug
Ao criar um workspace, uma coluna `slug` única é automaticamente gerada com base no nome do projeto (ex: `Academia Fitness` vira `academia-fitness`). As URLs amigáveis utilizam este slug para localizar o workspace na base de dados.

### Modos de Visualização:
1. **Modo Path (`PREVIEW_URL_TYPE=path`):**
   * O preview será servido na rota pública: `http://localhost:8000/preview/{slug}/{path?}`.
   * O iframe do editor apontará para esta rota unificada que lê os arquivos da pasta do workspace diretamente.
   * **Fallback para stacks dinâmicos:** Para projetos não-estáticos (Node, PHP puro, Django, etc.), a URL reverte automaticamente para a porta dedicada `http://localhost:{port}`. Isso evita que arquivos de assets relativos fujam da raiz da URL e quebrem na renderização.
2. **Modo Subdomínio (`PREVIEW_URL_TYPE=subdomain`):**
   * O preview será servido na rota de subdomínio dinâmico: `http://{slug}.localhost:8000/{path?}`.
   * O roteador do Laravel `routes/web.php` intercepta a requisição usando `Route::domain()` e serve os arquivos.
   * **Reverse Proxy:** Para stacks dinâmicas, o Laravel atua como um proxy reverso transparente encaminhando as chamadas HTTP diretamente para a porta interna do contêiner Docker ativo, unificando a experiência sob o subdomínio.
3. **Modo Port (`PREVIEW_URL_TYPE=port`):**
   * Comportamento legado que utiliza portas dedicadas por projeto (ex: `http://localhost:9003`).

---

## 🤖 5. Seleção Dinâmica de Modelos de IA

Os modelos de IA disponibilizados pelo administrador através do painel de controle são consumidos dinamicamente pelos clientes no chat do editor de código:

1. **Definição pelo Admin:** O administrador ativa/desativa modelos permitidos (como Gemini 2.0 Flash, Llama 3.3, DeepSeek V3) no painel administrativo, salvando a lista na tabela `settings`.
2. **Descoberta pelo Cliente:** O editor de códigos do frontend ([WorkspaceEditor.tsx](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/frontend/src/pages/WorkspaceEditor.tsx)) consome a API `/settings` e carrega dinamicamente a lista de modelos ativos em uma caixa de seleção (`select`) posicionada acima do prompt de envio de comandos.
3. **Envio e Execução:** Ao disparar um prompt, o frontend envia a escolha do modelo no corpo da requisição POST `/api/command`. O backend propaga a escolha para a CLI Go, instruindo a LLM do OpenRouter a processar os arquivos com o modelo selecionado (ex: `google/gemini-2.0-flash-001`).

