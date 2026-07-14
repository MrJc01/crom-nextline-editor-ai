# Relatório de Execução de Testes Automatizados

Este relatório apresenta os resultados da execução das suítes de testes unitários, funcionais e de integração de ponta a ponta no **Crom Nextline Editor AI**. Todos os testes foram executados com sucesso e obtiveram status **PASS**.

---

## 📊 Resumo Executivo
* **Total de Testes Planejados:** 18 (17 unitários/features + 1 E2E Playwright)
* **Total de Testes Executados:** 18
* **Passou (PASS):** 18 (100%)
* **Falhou (FAIL):** 0
* **Data da Execução:** 13/07/2026

---

## 👥 3 Workspaces de Teste Semeados
Para homologar a navegação e o seletor em grade do cliente, os seguintes workspaces foram criados no banco de dados SQLite e no disco:
1. **Landing Page de Academia** (ID: `22222222-2222-2222-2222-222222222222` / Porta: `9002`)
2. **E-Commerce de Calçados** (ID: `33333333-3333-3333-3333-333333333333` / Porta: `9003`)
3. **Portal de Eventos Tech** (ID: `44444444-4444-4444-4444-444444444444` / Porta: `9004`)

---

## 🎭 1. Teste de Integração E2E (Playwright)
* **Comando Executado:** `npx playwright test`
* **Local:** `frontend/tests/playwright.spec.ts`
* **Descrição:** Simula o fluxo completo do cliente no navegador: Login (`client@crom.run`/`password`), redirecionamento automático para a listagem `/dashboard`, verificação de presença dos 3 novos workspaces semeados, clique de navegação para a URL amigável `/workspace/22222222-2222-2222-2222-222222222222`, envio de prompt via chat de comandos, e navegação final para a página "Sobre".

### Resultado do Terminal:
```
Running 1 test using 1 worker
     1 …luxo completo: Login -> Dashboard -> Listagem dos 3 Workspaces -> Editor
  ✓  1 …mpleto: Login -> Dashboard -> Listagem dos 3 Workspaces -> Editor (1.5s)

  1 passed (2.0s)
```

---

## 🟢 2. Testes do Backend (Laravel PHPUnit)
* **Comando Executado:** `docker exec crom-backend-srv php artisan test`
* **Local:** `backend/tests/Feature/CromSystemTest.php`, `backend/tests/Feature/WorkspaceFilesTest.php`, `backend/tests/Feature/StackDetectorTest.php`

### Resultado do Terminal:
```
   PASS  Tests\Unit\ExampleTest
  ✓ that true is true
   PASS  Tests\Feature\CromSystemTest
  ✓ workspaces index returns list                                        0.16s
  ✓ create workspace persists in db                                      0.02s
  ✓ admin settings lifecycle                                             0.01s
  ✓ client points management                                             0.01s
  ✓ agent command blocks when insufficient points                        0.01s
   PASS  Tests\Feature\ExampleTest
  ✓ the application returns a successful response                        0.02s
   PASS  Tests\Feature\StackDetectorTest
  ✓ detects static site                                                  0.01s
  ✓ detects node vite with script port                                   0.01s
  ✓ detects laravel over plain php                                       0.01s
  ✓ detects go                                                           0.01s
  ✓ detects django                                                       0.01s
  ✓ override file wins                                                   0.01s
   PASS  Tests\Feature\WorkspaceFilesTest
  ✓ returns recursive tree                                               0.01s
  ✓ reads file content                                                   0.01s
  ✓ blocks path traversal                                                0.01s
  ✓ writes and creates and deletes                                       0.01s
  Tests:    17 passed (54 assertions)
  Duration: 0.38s
```

---

## 🟢 3. Testes do Frontend (React Vitest)
* **Comando Executado:** `npx vitest run` (ou rodado via build)
* **Local:** `frontend/src/tests/frontend.test.ts`

### Resultado do Terminal:
```
✓ src/tests/frontend.test.ts (5 tests) 3ms
  ✓ Testes Lógicos do Frontend React (5)
    ✓ 1. Deve formatar os pontos do cliente corretamente para a interface 1ms
    ✓ 2. Deve validar se o cliente tem pontos suficientes para o agente 0ms
    ✓ 3. Deve deduzir os pontos corretamente e não deixar ficar negativo 0ms
    ✓ 4. Deve gerar a URL de preview dinâmica dependendo do status do Docker 0ms
    ✓ 5. Deve validar o padrão de email de login corporativo do Crom 0ms

Test Files  1 passed (1)
     Tests  5 passed (5)
  Duration  138ms
```

---

## 🟢 4. Testes da CLI Go (Go Testing Tool)
* **Comando Executado:** `go test -v`
* **Local:** `cli/main_test.go`

### Resultado do Terminal:
```
=== RUN   TestModelDeepSeekRouting
--- PASS: TestModelDeepSeekRouting (0.00s)
=== RUN   TestModelGemmaRouting
--- PASS: TestModelGemmaRouting (0.00s)
=== RUN   TestModelQwenRouting
--- PASS: TestModelQwenRouting (0.00s)
=== RUN   TestFallbackFileWrite
--- PASS: TestFallbackFileWrite (0.00s)
=== RUN   TestModelDefaultRoutingFallback
--- PASS: TestModelDefaultRoutingFallback (0.00s)
PASS
ok      crom-cli        0.002s
```
