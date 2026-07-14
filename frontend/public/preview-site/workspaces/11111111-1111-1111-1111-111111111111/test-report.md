# Relatório de Execução de Testes Automatizados

Este relatório apresenta os resultados da execução das suítes de testes automatizados no **Crom Nextline Editor AI**. Todos os 15 testes foram executados com sucesso e obtiveram status **PASS**.

---

## 📊 Resumo Executivo
* **Total de Testes Planejados:** 15
* **Total de Testes Executados:** 15
* **Passou (PASS):** 15 (100%)
* **Falhou (FAIL):** 0
* **Data da Execução:** 13/07/2026

---

## 🟢 1. Testes do Backend (Laravel PHPUnit)
* **Comando Executado:** `php artisan test`
* **Local:** `backend/tests/Feature/CromSystemTest.php`

### Resultado do Terminal:
```
PASS  Tests\Unit\ExampleTest
✓ that true is true

PASS  Tests\Feature\CromSystemTest
✓ workspaces index returns list                                        0.14s
✓ create workspace persists in db                                      0.02s
✓ admin settings lifecycle                                             0.01s
✓ client points management                                             0.01s
✓ agent command blocks when insufficient points                        0.01s

PASS  Tests\Feature\ExampleTest
✓ the application returns a successful response                        0.02s

Tests:    7 passed (22 assertions)
Duration: 0.29s
```

---

## 🟢 2. Testes do Frontend (React Vitest)
* **Comando Executado:** `npx vitest run`
* **Local:** `frontend/src/tests/frontend.test.ts`

### Resultado do Terminal:
```
RUN  v4.1.10 /home/j/Documentos/GitHub/crom-nextline-editor-ai/frontend

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

## 🟢 3. Testes da CLI Go (Go Testing Tool)
* **Comando Executado:** `go test -v`
* **Local:** `cli/main_test.go`

### Resultado do Terminal:
```
=== RUN   TestModelDeepSeekRouting
--- PASS: TestModelDeepSeekRouting (0.00s)
=== RUN   TestModelGemmaRouting
--- PASS: TestModelGemmaRouting (0.00s)
=== RUN   TestModelQwenRouting
--- PASS: TestModelQwenRouting (0.05s)
=== RUN   TestFallbackFileWrite
--- PASS: TestFallbackFileWrite (0.00s)
=== RUN   TestModelDefaultRoutingFallback
--- PASS: TestModelDefaultRoutingFallback (0.00s)
PASS
ok      crom-cli        0.002s
```

---

## 🤖 Modelos Utilizados e Configurados
De acordo com os parâmetros de homologação de IA ativos nas tabelas SQLite:
* **Modelo Default (Ativo):** `google/gemini-2.0-flash`
* **Modelo para Codificação (Ativo):** `meta-llama/llama-3.3-70b-instruct`
* **Modelo Alternativo / Fallback (Ativo):** `deepseek/deepseek-chat` (DeepSeek V3)
