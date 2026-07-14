<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        \App\Models\User::updateOrCreate(
            ['email' => 'admin@crom.run'],
            [
                'name' => 'Administrador',
                'password' => bcrypt('password'),
                'role' => 'admin',
            ]
        );

        $clientUser = \App\Models\User::updateOrCreate(
            ['email' => 'client@crom.run'],
            [
                'name' => 'Cliente de Teste',
                'password' => bcrypt('password'),
                'role' => 'client',
            ]
        );

        $hostRoot = env('HOST_PROJECT_PATH', '/home/j/Documentos/GitHub/crom-nextline-editor-ai');
        $templates = new \App\Services\WorkspaceTemplates();

        $ws1 = \App\Models\Workspace::updateOrCreate(
            ['id' => '22222222-2222-2222-2222-222222222222'],
            [
                'user_id' => $clientUser->id,
                'name' => 'Landing Page de Academia',
                'port' => 9002,
                'status' => 'stopped',
                'path' => $hostRoot . '/frontend/public/preview-site/workspaces/22222222-2222-2222-2222-222222222222',
                'stack' => 'static',
            ]
        );
        $templates->scaffold($ws1->localPath(), 'static', $ws1->name);

        $ws2 = \App\Models\Workspace::updateOrCreate(
            ['id' => '33333333-3333-3333-3333-333333333333'],
            [
                'user_id' => $clientUser->id,
                'name' => 'E-Commerce de Calçados',
                'port' => 9003,
                'status' => 'stopped',
                'path' => $hostRoot . '/frontend/public/preview-site/workspaces/33333333-3333-3333-3333-333333333333',
                'stack' => 'static',
            ]
        );
        $templates->scaffold($ws2->localPath(), 'static', $ws2->name);

        $ws3 = \App\Models\Workspace::updateOrCreate(
            ['id' => '44444444-4444-4444-4444-444444444444'],
            [
                'user_id' => $clientUser->id,
                'name' => 'Portal de Eventos Tech',
                'port' => 9004,
                'status' => 'stopped',
                'path' => $hostRoot . '/frontend/public/preview-site/workspaces/44444444-4444-4444-4444-444444444444',
                'stack' => 'static',
            ]
        );
        $templates->scaffold($ws3->localPath(), 'static', $ws3->name);
    }
}
