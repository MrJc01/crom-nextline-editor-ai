<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('email')->unique();
            $table->integer('points')->default(500);
            $table->timestamps();
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        // Seed default settings
        DB::table('settings')->insert([
            [
                'key' => 'openrouter_api_key',
                'value' => env('OPENROUTER_API_KEY', ''),
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'key' => 'points_cost_per_request',
                'value' => '10',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'key' => 'allowed_models',
                'value' => json_encode([
                    'google/gemini-2.0-flash',
                    'meta-llama/llama-3.3-70b-instruct',
                    'deepseek/deepseek-chat'
                ]),
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'key' => 'default_model',
                'value' => 'google/gemini-2.0-flash',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);

        // Seed default client
        DB::table('clients')->insert([
            'id' => '11111111-1111-1111-1111-111111111111',
            'name' => 'Cliente de Teste',
            'email' => 'client@crom.run',
            'points' => 500,
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clients');
        Schema::dropIfExists('settings');
    }
};
