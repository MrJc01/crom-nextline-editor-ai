<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workspaces', function (Blueprint $table) {
            $table->string('stack')->nullable()->after('name');
            $table->string('framework')->nullable()->after('stack');
            $table->integer('internal_port')->nullable()->after('port');
            $table->string('container_id')->nullable()->after('status');
            $table->string('health')->default('unknown')->after('container_id');
            $table->string('preview_url')->nullable()->after('health');
            $table->text('last_error')->nullable()->after('preview_url');
        });
    }

    public function down(): void
    {
        Schema::table('workspaces', function (Blueprint $table) {
            $table->dropColumn(['stack', 'framework', 'internal_port', 'container_id', 'health', 'preview_url', 'last_error']);
        });
    }
};
