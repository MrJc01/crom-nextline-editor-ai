<?php

use App\Http\Controllers\AgentController;
use App\Http\Controllers\WorkspaceController;
use App\Http\Controllers\AdminController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/command', [AgentController::class, 'handleCommand']);
Route::get('/files', [AgentController::class, 'getFiles']);
Route::post('/reset', [AgentController::class, 'resetWorkspace']);

Route::get('/workspaces', [WorkspaceController::class, 'index']);
Route::post('/workspaces', [WorkspaceController::class, 'store']);
Route::post('/workspaces/{id}/start', [WorkspaceController::class, 'start']);
Route::post('/workspaces/{id}/stop', [WorkspaceController::class, 'stop']);

Route::get('/settings', [AdminController::class, 'getSettings']);
Route::post('/settings', [AdminController::class, 'updateSettings']);
Route::get('/clients', [AdminController::class, 'getClients']);
Route::post('/clients/{id}/points', [AdminController::class, 'grantPoints']);
Route::get('/client-points', [AdminController::class, 'getClientPoints']);
