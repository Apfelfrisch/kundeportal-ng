<?php

declare(strict_types=1);

use App\Http\Controllers\Charts\BilledLoadProfileController;
use App\Http\Controllers\Charts\EdiLoadProfileController;
use App\Http\Controllers\Charts\MarketPriceController;
use App\Http\Controllers\Charts\UsageController;
use Illuminate\Support\Facades\Route;

// Chart data endpoints — market prices and billed/EDI load profiles,
// feature-flag gated per tenant (404 when the flag is off).
Route::prefix('customers/{user}')
    ->whereNumber('user')
    ->middleware(['auth:sanctum', 'password.set', 'verified', 'can:actFor,user'])
    ->group(function (): void {
        Route::get('market-prices', MarketPriceController::class)
            ->middleware('feature:dynamic-electric-prices')
            ->name('customer.market-prices.show');

        Route::get('contracts/{contractNumber}/billed-load-profiles', BilledLoadProfileController::class)
            ->whereNumber('contractNumber')
            ->middleware('feature:dynamic-electric-prices')
            ->name('customer.billed-load-profiles.show');

        Route::get('contracts/{contractNumber}/usage', UsageController::class)
            ->whereNumber('contractNumber')
            ->middleware('feature:dynamic-electric-prices')
            ->name('customer.usage.show');

        Route::get('contracts/{contractNumber}/edi-load-profiles', EdiLoadProfileController::class)
            ->whereNumber('contractNumber')
            ->middleware('feature:edi-load-profiles')
            ->name('customer.edi-load-profiles.show');
    });
