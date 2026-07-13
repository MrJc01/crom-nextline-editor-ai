<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Workspace;
use App\Models\Client;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CromSystemTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test 1: GET /api/workspaces list response.
     */
    public function test_workspaces_index_returns_list()
    {
        Workspace::create([
            'id' => '22222222-2222-2222-2222-222222222222',
            'name' => 'Meu Portal de Teste',
            'port' => 9005,
            'status' => 'stopped',
            'path' => '/tmp/workspaces/test'
        ]);

        $response = $this->getJson('/api/workspaces');

        $response->assertStatus(200)
                 ->assertJsonPath('status', 'success')
                 ->assertJsonStructure(['status', 'workspaces']);
    }

    /**
     * Test 2: POST /api/workspaces creates workspace in database.
     */
    public function test_create_workspace_persists_in_db()
    {
        $response = $this->postJson('/api/workspaces', [
            'name' => 'Landing Page Alpha'
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('workspaces', [
            'name' => 'Landing Page Alpha'
        ]);
    }

    /**
     * Test 3: GET & POST /api/settings updates values.
     */
    public function test_admin_settings_lifecycle()
    {
        // 1. Get default settings
        $response = $this->getJson('/api/settings');
        $response->assertStatus(200)
                 ->assertJsonPath('status', 'success');

        // 2. Update setting
        $response = $this->postJson('/api/settings', [
            'openrouter_api_key' => 'sk-or-v1-custom-key-for-test',
            'points_cost_per_request' => 20
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('settings', [
            'key' => 'openrouter_api_key',
            'value' => 'sk-or-v1-custom-key-for-test'
        ]);
        $this->assertDatabaseHas('settings', [
            'key' => 'points_cost_per_request',
            'value' => '20'
        ]);
    }

    /**
     * Test 4: GET /api/client-points and POST points increment.
     */
    public function test_client_points_management()
    {
        // Recuperar o cliente padrão semeado
        $client = Client::where('email', 'client@crom.run')->first();

        // 1. Fetch points
        $response = $this->getJson('/api/client-points');
        $response->assertStatus(200)
                 ->assertJsonPath('points', 500);

        // 2. Grant points
        $response = $this->postJson("/api/clients/{$client->id}/points", [
            'points' => 150
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('clients', [
            'id' => $client->id,
            'points' => 650
        ]);
    }

    /**
     * Test 5: POST /api/command returns 403 when points are insufficient.
     */
    public function test_agent_command_blocks_when_insufficient_points()
    {
        // Criar cliente de teste pobre com e-mail único
        $client = Client::create([
            'id' => '33333333-3333-3333-3333-333333333333',
            'name' => 'Cliente Pobre',
            'email' => 'poor@crom.run',
            'points' => 5
        ]);

        Setting::updateOrCreate(['key' => 'points_cost_per_request'], ['value' => '10']);

        $response = $this->postJson('/api/command', [
            'prompt' => 'Adicione um rodapé',
            'workspace_id' => null,
            'client_id' => $client->id
        ]);

        $response->assertStatus(403)
                 ->assertJsonPath('status', 'error')
                 ->assertJsonFragment([
                     'message' => 'Saldo de pontos insuficiente para rodar o agente! Você possui apenas 5 pontos de um custo de 10.'
                 ]);
    }
}
