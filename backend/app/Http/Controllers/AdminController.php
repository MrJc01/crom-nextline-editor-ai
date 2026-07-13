<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Client;
use App\Models\Setting;

class AdminController extends Controller
{
    /**
     * Get settings list.
     */
    public function getSettings()
    {
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
        $request->validate([
            'points' => 'required|integer'
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
