<?php

declare(strict_types=1);

use App\Http\Controllers\Customer\ContractController;
use App\Http\Controllers\Customer\ContractFileController;
use App\Http\Controllers\Customer\ProfileController;
use Illuminate\Support\Facades\Route;

Route::prefix('customers/{user}')
    ->whereNumber('user')
    ->middleware(['auth:sanctum', 'password.set', 'verified', 'can:actFor,user'])
    ->group(function (): void {
        Route::get('', [ContractController::class, 'index'])
            ->name('customer.contracts.index');

        Route::get('contracts/{contractNumber}', [ContractController::class, 'show'])
            ->whereNumber('contractNumber')
            ->name('customer.contracts.show');

        Route::get('contracts/{contractNumber}/files/{fileId}', [ContractFileController::class, 'show'])
            ->whereNumber(['contractNumber', 'fileId'])
            ->name('customer.contract-files.show');

        Route::get('profile', [ProfileController::class, 'show'])
            ->name('customer.profile.show');

        Route::put('profile/email', [ProfileController::class, 'updateEmail'])
            ->name('customer.profile.email.update');

        Route::put('profile/password', [ProfileController::class, 'updatePassword'])
            ->name('customer.profile.password.update');
    });
