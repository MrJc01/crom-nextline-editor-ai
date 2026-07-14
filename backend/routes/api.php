<?php

use App\Http\Controllers\AgentController;
use App\Http\Controllers\WorkspaceController;
use App\Http\Controllers\AdminController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;

// Public auth endpoints
Route::post('/login', [AuthController::class, 'login']);

// Public raw workspace files endpoint for preview iframe (needs to remain public as headers cannot be sent via iframe src easily)
Route::get('/workspaces/{id}/raw/{path?}', [WorkspaceController::class, 'raw'])->where('path', '.*');

// Protected API endpoints
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Agent (AI / Files) endpoints
    Route::post('/command', [AgentController::class, 'handleCommand'])->middleware('throttle:20,1');
    Route::get('/files', [AgentController::class, 'getFiles']);
    Route::get('/file', [AgentController::class, 'getFile']);
    Route::put('/file', [AgentController::class, 'saveFile']);
    Route::post('/file', [AgentController::class, 'createEntry']);
    Route::patch('/file', [AgentController::class, 'renameEntry']);
    Route::delete('/file', [AgentController::class, 'deleteEntry']);
    Route::post('/reset', [AgentController::class, 'resetWorkspace']);

    // Workspace lifecycle management
    Route::get('/workspaces', [WorkspaceController::class, 'index']);
    Route::post('/workspaces', [WorkspaceController::class, 'store']);
    Route::get('/workspaces/{id}/status', [WorkspaceController::class, 'status']);
    Route::get('/workspaces/{id}/logs', [WorkspaceController::class, 'logs']);
    Route::post('/workspaces/{id}/start', [WorkspaceController::class, 'start'])->middleware('throttle:30,1');
    Route::post('/workspaces/{id}/stop', [WorkspaceController::class, 'stop']);
    Route::post('/workspaces/{id}/restart', [WorkspaceController::class, 'restart'])->middleware('throttle:30,1');
    Route::get('/workspaces/{id}/download', [WorkspaceController::class, 'download']);

    // Admin configuration
    Route::get('/settings', [AdminController::class, 'getSettings']);
    Route::post('/settings', [AdminController::class, 'updateSettings']);
    Route::get('/clients', [AdminController::class, 'getClients']);
    Route::post('/clients/{id}/points', [AdminController::class, 'grantPoints']);
    Route::get('/client-points', [AdminController::class, 'getClientPoints']);
});
