<?php

use App\Http\Controllers\Api\PrinterController;
use App\Http\Controllers\Api\PrintRouteController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Print Routes API
|--------------------------------------------------------------------------
|
| مسارات إدارة الطابعات الشبكية وقواعد التوجيه الذكي
| محمية بمصادقة Sanctum + صلاحيات ADMIN فقط
|
*/

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {

    // ── الطابعات ──────────────────────────────────────────
    Route::get('/printers', [PrinterController::class, 'index']);
    Route::post('/printers', [PrinterController::class, 'store']);
    Route::get('/printers/{id}', [PrinterController::class, 'show']);
    Route::put('/printers/{id}', [PrinterController::class, 'update']);
    Route::delete('/printers/{id}', [PrinterController::class, 'destroy']);
    Route::post('/printers/{id}/test', [PrinterController::class, 'testConnection']);
    Route::get('/printers/{printerId}/routes', [PrinterController::class, 'routes']);

    // ── قواعد التوجيه ─────────────────────────────────────
    Route::get('/print-routes', [PrintRouteController::class, 'index']);
    Route::post('/print-routes', [PrintRouteController::class, 'store']);
    Route::put('/print-routes/{id}', [PrintRouteController::class, 'update']);
    Route::delete('/print-routes/{id}', [PrintRouteController::class, 'destroy']);
});
