<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WorkspaceController;

$previewType = env('PREVIEW_URL_TYPE', 'port');
$previewBaseUrl = env('PREVIEW_BASE_URL', 'http://localhost:8000');
$host = parse_url($previewBaseUrl, PHP_URL_HOST) ?? 'localhost';

if ($previewType === 'subdomain') {
    Route::domain('{slug}.' . $host)->group(function () {
        Route::get('/{path?}', [WorkspaceController::class, 'rawBySlug'])->where('path', '.*');
    });
}

// Fallback path route
Route::get('/preview/{slug}/{path?}', [WorkspaceController::class, 'rawBySlug'])->where('path', '.*');

Route::get('/', function () {
    return view('welcome');
});

