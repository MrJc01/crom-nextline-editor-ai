<?php

use App\Http\Controllers\AgentController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/command', [AgentController::class, 'handleCommand']);
Route::get('/files', [AgentController::class, 'getFiles']);
Route::post('/reset', [AgentController::class, 'resetWorkspace']);
