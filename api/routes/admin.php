<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

// Admin area (/api/admin/*) — dashboard, contract search, user management,
// contract assignments, tickets and outbox land here in phase 6.
Route::prefix('admin')
    ->middleware(['auth:sanctum', 'admin'])
    ->group(function (): void {
        //
    });
