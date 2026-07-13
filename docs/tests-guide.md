# Guia de Testes Automatizados

Este documento descreve o funcionamento e a cobertura da suíte de 15 testes automatizados implementados no ecossistema do **Crom Nextline Editor AI** (5 no Backend, 5 no Frontend e 5 na CLI Go).

---

## 🧪 1. Testes do Backend (Laravel PHPUnit)

**Arquivo de Testes:** [CromSystemTest.php](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/backend/tests/Feature/CromSystemTest.php)  
**Objetivo:** Validar o comportamento de APIs REST, persistência em banco de dados SQLite e lógica de bloqueio de créditos do cliente.

### Cobertura (5 Testes):
1. **`test_workspaces_index_returns_list`:** Garante que a listagem de workspaces retorna uma resposta HTTP 200 contendo a estrutura JSON correta.
2. **`test_create_workspace_persists_in_db`:** Valida que o endpoint de criação de projeto insere corretamente o registro no banco de dados e retorna o status HTTP 201.
3. **`test_admin_settings_lifecycle`:** Testa se o administrador consegue buscar e salvar parâmetros globais (como chaves de API e custos) na tabela `settings`.
4. **`test_client_points_management`:** Verifica a busca de saldos de pontos de clientes e se a inserção de novos créditos adiciona os pontos corretamente.
5. **`test_agent_command_blocks_when_insufficient_points`:** Valida a regra de saldo de pontos no endpoint `/api/command`. Se o cliente tiver saldo menor que o custo por requisição, a chamada é bloqueada com HTTP 403.

### Como Executar:
```bash
docker exec crom-backend-srv php artisan test
```

---

## 💻 2. Testes do Frontend (Vitest)

**Arquivo de Testes:** [frontend.test.ts](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/frontend/src/tests/frontend.test.ts)  
**Objetivo:** Validar cálculos lógicos de pontos, validações de logins e caminhos de renderização do iframe do preview.

### Cobertura (5 Testes):
1. **Deve formatar os pontos do cliente corretamente:** Garante que pontos como `500` são exibidos formatados como `500 pts` na interface do cabeçalho.
2. **Deve validar saldo mínimo:** Verifica se o frontend sabe se o cliente tem pontos suficientes comparando com a taxa de uso do admin.
3. **Deve deduzir pontos sem negativar:** Testa o cálculo matemático do saldo restante impedindo valores negativos na interface.
4. **Deve gerar a URL de preview dinâmica:** Valida se o Iframe é apontado para a porta exclusiva Nginx se o contêiner estiver `running`, ou se utiliza a pasta estática do Vite como fallback caso esteja `stopped`.
5. **Deve validar padrão de email do Crom:** Garante a validação de endereços de e-mail administrativos `@crom.run`.

### Como Executar:
```bash
npx vitest run
```

---

## ⚙️ 3. Testes da CLI Go (Go Testing Tool)

**Arquivo de Testes:** [main_test.go](file:///home/j/Documentos/GitHub/crom-nextline-editor-ai/cli/main_test.go)  
**Objetivo:** Validar o comportamento do parser de argumentos da CLI Go, o fallback de gravação estática e o mapeamento de modelos das LLMs (DeepSeek, Gemma, Qwen).

### Cobertura (5 Testes):
1. **`TestModelDeepSeekRouting`:** Verifica se o identificador `deepseek` é roteado para `deepseek/deepseek-chat` no OpenRouter.
2. **`TestModelGemmaRouting`:** Verifica se o identificador `gemma` é roteado para o modelo `google/gemma-2-27b-it` para codificação rápida.
3. **`TestModelQwenRouting`:** Verifica se o identificador `qwen` é roteado para o modelo `qwen/qwen-2.5-coder-32b-instruct` para tarefas complexas.
4. **`TestFallbackFileWrite`:** Garante que a escrita do arquivo index.html em disco de fallback funciona caso o daemon WebSocket de IA esteja indisponível.
5. **`TestModelDefaultRoutingFallback`:** Valida que qualquer modelo inválido inserido é direcionado com segurança para o fallback principal do sistema (Claude 3.5 Sonnet).

### Como Executar:
```bash
go test -v
```
