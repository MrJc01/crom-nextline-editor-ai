<?php

namespace App\Console\Commands;

use App\Models\Workspace;
use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

/**
 * Remove contêineres de preview órfãos: rotulados com crom.workspace mas cujo
 * workspace não existe mais ou está marcado como parado no banco.
 */
class ReapContainers extends Command
{
    protected $signature = 'crom:reap {--dry-run : Apenas lista o que seria removido}';

    protected $description = 'Remove contêineres de preview órfãos do Crom Nextline';

    public function handle(): int
    {
        $list = new Process(['docker', 'ps', '-a', '--filter', 'label=crom.workspace', '--format', '{{.Names}}\t{{.Label "crom.workspace"}}']);
        $list->run();

        if (!$list->isSuccessful()) {
            $this->error('Não foi possível consultar o Docker: ' . trim($list->getErrorOutput()));
            return self::FAILURE;
        }

        $lines = array_filter(explode("\n", trim($list->getOutput())));
        $reaped = 0;

        foreach ($lines as $line) {
            [$name, $wsId] = array_pad(explode("\t", $line), 2, '');
            $ws = Workspace::find($wsId);

            // Órfão se: workspace não existe OU não está ativo no banco.
            $orphan = !$ws || !in_array($ws->status, ['running', 'starting'], true);
            if (!$orphan) {
                continue;
            }

            $this->line(($this->option('dry-run') ? '[dry] ' : '') . "removendo $name (workspace: " . ($ws ? $ws->status : 'inexistente') . ')');

            if (!$this->option('dry-run')) {
                (new Process(['docker', 'rm', '-f', $name]))->run();
                if ($ws) {
                    $ws->update(['status' => 'stopped', 'health' => 'unknown', 'container_id' => null, 'preview_url' => null]);
                }
            }
            $reaped++;
        }

        $this->info("$reaped contêiner(es) órfão(s) " . ($this->option('dry-run') ? 'seriam removidos.' : 'removidos.'));
        return self::SUCCESS;
    }
}
