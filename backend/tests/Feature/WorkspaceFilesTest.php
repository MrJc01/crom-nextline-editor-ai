<?php

namespace Tests\Feature;

use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class WorkspaceFilesTest extends TestCase
{
    use RefreshDatabase;

    private Workspace $ws;
    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();
        $id = (string) Str::uuid();
        
        $user = \App\Models\User::factory()->create([
            'role' => 'client'
        ]);
        \Laravel\Sanctum\Sanctum::actingAs($user);

        $this->ws = Workspace::create([
            'id' => $id,
            'user_id' => $user->id,
            'name' => 'Teste Files',
            'stack' => 'static',
            'port' => 9500,
            'status' => 'stopped',
            'path' => '/host/whatever/' . $id,
        ]);
        
        $this->dir = storage_path('app/workspaces/' . $id);
        @mkdir($this->dir . '/src', 0755, true);
        file_put_contents($this->dir . '/index.html', '<h1>oi</h1>');
        file_put_contents($this->dir . '/src/app.js', 'console.log(1)');
    }

    protected function tearDown(): void
    {
        if (is_dir($this->dir)) {
            @unlink($this->dir . '/src/app.js');
            @unlink($this->dir . '/index.html');
            @rmdir($this->dir . '/src');
            @rmdir($this->dir);
        }
        parent::tearDown();
    }

    public function test_returns_recursive_tree(): void
    {
        $res = $this->getJson('/api/files?workspace_id=' . $this->ws->id);
        $res->assertOk()->assertJsonPath('status', 'success');
        $names = collect($res->json('tree'))->pluck('name')->all();
        $this->assertContains('index.html', $names);
        $this->assertContains('src', $names);
    }

    public function test_reads_file_content(): void
    {
        $res = $this->getJson('/api/file?workspace_id=' . $this->ws->id . '&path=src/app.js');
        $res->assertOk()
            ->assertJsonPath('content', 'console.log(1)')
            ->assertJsonPath('lang', 'js');
    }

    public function test_blocks_path_traversal(): void
    {
        $res = $this->getJson('/api/file?workspace_id=' . $this->ws->id . '&path=' . urlencode('../../../../etc/passwd'));
        $res->assertStatus(422)->assertJsonPath('status', 'error');
    }

    public function test_writes_and_creates_and_deletes(): void
    {
        // create
        $this->postJson('/api/file', ['workspace_id' => $this->ws->id, 'path' => 'novo.txt', 'type' => 'file'])
            ->assertOk();
        $this->assertFileExists($this->dir . '/novo.txt');

        // write
        $this->putJson('/api/file', ['workspace_id' => $this->ws->id, 'path' => 'novo.txt', 'content' => 'conteudo'])
            ->assertOk();
        $this->assertSame('conteudo', file_get_contents($this->dir . '/novo.txt'));

        // delete
        $this->deleteJson('/api/file', ['workspace_id' => $this->ws->id, 'path' => 'novo.txt'])
            ->assertOk();
        $this->assertFileDoesNotExist($this->dir . '/novo.txt');
    }
}
