<?php

declare(strict_types=1);

use App\Http\Controllers\TenantController;
use Illuminate\Support\Facades\Route;

Route::get('/tenant', TenantController::class)->name('tenant');
