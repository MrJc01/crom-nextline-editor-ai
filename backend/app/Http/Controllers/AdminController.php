<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Client;
use App\Models\Setting;

class AdminController extends Controller
{
    /**
     * Verifica se o usuário autenticado é admin. Aborta com 403 caso contrário.
     */
    private function authorizeAdmin(): void
    {
        $user = auth()->user();
        if (!$user || $user->role !== 'admin') {
            abort(403, 'Acesso restrito a administradores.');
        }
    }
    /**
     * Get settings list.
     */
    public function getSettings()
    {
        $this->authorizeAdmin();
        $settings = Setting::all()->pluck('value', 'key');
        return response()->json([
            'status' => 'success',
            'settings' => $settings
        ]);
    }

    /**
     * Update settings.
     */
    public function updateSettings(Request $request)
    {
        $this->authorizeAdmin();
        $data = $request->validate([
            'openrouter_api_key' => 'nullable|string',
            'points_cost_per_request' => 'required|integer|min:0'
        ]);

        foreach ($data as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => (string)$value]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Configurações atualizadas com sucesso!'
        ]);
    }

    /**
     * Get clients list.
     */
    public function getClients()
    {
        $this->authorizeAdmin();
        $clients = Client::all();
        return response()->json([
            'status' => 'success',
            'clients' => $clients
        ]);
    }

    /**
     * Grant points to client.
     */
    public function grantPoints(Request $request, $id)
    {
        $this->authorizeAdmin();
        $request->validate([
            'points' => 'required|integer|min:1'
        ]);

        $client = Client::find($id);
        if (!$client) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cliente não encontrado.'
            ], 404);
        }

        $client->increment('points', $request->input('points'));

        return response()->json([
            'status' => 'success',
            'message' => 'Pontos creditados com sucesso!',
            'client' => $client
        ]);
    }

    /**
     * Get default client points.
     */
    public function getClientPoints()
    {
        $client = Client::firstOrCreate(
            ['id' => '11111111-1111-1111-1111-111111111111'],
            ['name' => 'Cliente de Teste', 'email' => 'client@crom.run', 'points' => 500]
        );

        return response()->json([
            'status' => 'success',
            'points' => $client->points
        ]);
    }
}
