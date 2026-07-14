<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workspaces', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('name');
        });

        // Populate existing slugs
        $workspaces = DB::table('workspaces')->get();
        foreach ($workspaces as $w) {
            $slug = Str::slug($w->name);
            $count = 0;
            $baseSlug = $slug;
            while (DB::table('workspaces')->where('slug', $slug)->where('id', '!=', $w->id)->exists()) {
                $count++;
                $slug = $baseSlug . '-' . $count;
            }
            DB::table('workspaces')->where('id', $w->id)->update(['slug' => $slug]);
        }
    }

    public function down(): void
    {
        Schema::table('workspaces', function (Blueprint $table) {
            $table->dropColumn('slug');
        });
    }
};
