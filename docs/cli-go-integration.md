# Integração com o Wrapper Go CLI & Crom Agente

Este documento descreve como o backend Laravel interage com o binário nativo escrito em Go (`crom-cli`) e como este se comunica com o ecossistema do **Crom Agente** e seu SDK.

---

## 🛠️ O Binário Go (`crom-cli`)

O wrapper de linha de comando em Go desempenha um papel crítico como uma ponte de alto desempenho entre o servidor web PHP (Laravel) e o agente autônomo.

### Principais Benefícios:
1. **Performance:** Execução instantânea sem a sobrecarga de inicialização de processos pesados.
2. **Tipagem Forte:** Integração nativa com o `crom-agente-sdk` (escrito em Go).
3. **Distribuição Simples:** Compila em um único arquivo binário auto-contido.

---

## 🔌 Comunicação Laravel ➔ Go CLI

O Laravel utiliza o componente `Symfony\Component\Process\Process` do PHP para invocar o binário no disco de forma controlada e segura.

### Exemplo de Fluxo de Código (Laravel):
```php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;

class AgentController extends Controller
{
    public function handleCommand(Request $request)
    {
        $request->validate([
            'prompt' => 'required|string',
        ]);

        $prompt = $request->input('prompt');

        // Cria o processo informando o binário e seus argumentos
        $process = new Process([
            base_path('../cli/crom-cli'),
            '--action=modify',
            '--prompt=' . $prompt,
            '--workspace=' . base_path('../frontend/public/preview-site')
        ]);

        $process->run();

        // Se falhar, joga uma exceção renderizada em JSON
        if (!$process->isSuccessful()) {
            throw new ProcessFailedException($process);
        }

        $output = json_decode($process->getOutput(), true);

        return response()->json([
            'status' => 'success',
            'message' => $output['message'] ?? 'Modificações aplicadas.',
            'steps' => $output['steps'] ?? []
        ]);
    }
}
```

---

## 🧬 Integração do Go com o Crom Agente SDK

O código fonte em Go importará o `crom-agente-sdk-go` para disparar as tarefas de IA local.

### Exemplo Conceitual em Go (`cli/main.go`):
```go
package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/MrJc01/crom-agente-sdk/sdk"
)

func main() {
	action := flag.String("action", "", "Ação a ser executada")
	prompt := flag.String("prompt", "", "Instrução de IA")
	workspace := flag.String("workspace", "", "Caminho do site a ser editado")
	flag.Parse()

	if *action == "" || *prompt == "" || *workspace == "" {
		fmt.Println(`{"status":"error","message":"Argumentos inválidos"}`)
		os.Exit(1)
	}

	// Inicializa o cliente do SDK conectado ao daemon local
	client := sdk.NewClient(sdk.Config{
		Address: "localhost:50051", // Porta gRPC padrão do Crom Agente
	})

	// Envia a tarefa de modificação
	result, err := client.ModifyWorkspace(*workspace, *prompt)
	if err != nil {
		fmt.Printf(`{"status":"error","message":"Falha no agente: %s"}\n`, err.Error())
		os.Exit(1)
	}

	// Retorna o resultado formatado em JSON para que o PHP o leia
	fmt.Printf(`{
		"status": "success",
		"message": "%s",
		"steps": ["Verificado contexto", "Injetado modificações", "Validado compilação"]
	}\n`, result.Summary)
}
```
