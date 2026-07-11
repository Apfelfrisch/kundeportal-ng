<?php

declare(strict_types=1);

use App\Http\Controllers\TenantController;
use Illuminate\Support\Facades\Route;

Route::get('/tenant', TenantController::class)->name('tenant');

require __DIR__.'/auth.php';
require __DIR__.'/customer.php';
require __DIR__.'/admin.php';
require __DIR__.'/charts.php';
