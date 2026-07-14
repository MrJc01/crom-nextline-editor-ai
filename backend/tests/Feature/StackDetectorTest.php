<?php

namespace Tests\Feature;

use App\Services\StackDetector;
use Tests\TestCase;

class StackDetectorTest extends TestCase
{
    private StackDetector $detector;
    private string $base;

    protected function setUp(): void
    {
        parent::setUp();
        $this->detector = new StackDetector();
        $this->base = sys_get_temp_dir() . '/crom-stack-' . uniqid();
        mkdir($this->base, 0755, true);
    }

    protected function tearDown(): void
    {
        $this->rrmdir($this->base);
        parent::tearDown();
    }

    private function fixture(string $name, array $files): string
    {
        $dir = "$this->base/$name";
        mkdir($dir, 0755, true);
        foreach ($files as $file => $content) {
            file_put_contents("$dir/$file", $content);
        }
        return $dir;
    }

    private function rrmdir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        foreach (scandir($dir) as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = "$dir/$item";
            is_dir($path) ? $this->rrmdir($path) : unlink($path);
        }
        rmdir($dir);
    }

    public function test_detects_static_site(): void
    {
        $dir = $this->fixture('static', ['index.html' => '<h1>oi</h1>']);
        $m = $this->detector->detect($dir);
        $this->assertSame('static', $m['type']);
        $this->assertSame('nginx:alpine', $m['image']);
        $this->assertSame(80, $m['internal_port']);
    }

    public function test_detects_node_vite_with_script_port(): void
    {
        $dir = $this->fixture('node', [
            'package.json' => json_encode([
                'dependencies' => ['vite' => '^5'],
                'scripts' => ['dev' => 'vite --port 4321'],
            ]),
        ]);
        $m = $this->detector->detect($dir);
        $this->assertSame('node', $m['type']);
        $this->assertSame('vite', $m['framework']);
        // A porta do script vence o default e o comando de start deve refletir a mesma porta.
        $this->assertSame(4321, $m['internal_port']);
        $this->assertStringContainsString('--port 4321', $m['start']);
    }

    public function test_detects_laravel_over_plain_php(): void
    {
        $dir = $this->fixture('laravel', ['artisan' => '', 'composer.json' => '{}']);
        $m = $this->detector->detect($dir);
        $this->assertSame('php', $m['type']);
        $this->assertSame('laravel', $m['framework']);
        $this->assertSame(8000, $m['internal_port']);
    }

    public function test_detects_go(): void
    {
        $dir = $this->fixture('go', ['go.mod' => 'module x']);
        $m = $this->detector->detect($dir);
        $this->assertSame('go', $m['type']);
        $this->assertSame('go run .', $m['start']);
    }

    public function test_detects_django(): void
    {
        $dir = $this->fixture('py', ['manage.py' => '', 'requirements.txt' => 'django']);
        $m = $this->detector->detect($dir);
        $this->assertSame('python', $m['type']);
        $this->assertSame('django', $m['framework']);
    }

    public function test_override_file_wins(): void
    {
        $dir = $this->fixture('override', [
            'package.json' => '{}',
            '.crom-workspace.json' => json_encode([
                'type' => 'custom',
                'image' => 'node:20-alpine',
                'start' => 'pnpm dev --port 4000',
                'internal_port' => 4000,
            ]),
        ]);
        $m = $this->detector->detect($dir);
        $this->assertSame('custom', $m['type']);
        $this->assertSame('node:20-alpine', $m['image']);
        $this->assertSame(4000, $m['internal_port']);
    }
}
