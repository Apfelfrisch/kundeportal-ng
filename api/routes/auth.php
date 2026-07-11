<?php

declare(strict_types=1);

use App\Http\Controllers\Auth\AccountSetupController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ContractConfirmationController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\SetPasswordController;
use App\Http\Controllers\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('login', [AuthenticatedSessionController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('login');

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->middleware('auth:sanctum')
        ->name('logout');

    Route::get('session', [AuthenticatedSessionController::class, 'show'])
        ->name('session');

    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('password.email');

    Route::post('reset-password', [NewPasswordController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('password.store');

    Route::get('account-setup/{user}/{hash}', [AccountSetupController::class, 'show'])
        ->middleware('signed')
        ->name('account.setup');

    Route::post('account-setup/{user}/{hash}', [AccountSetupController::class, 'store'])
        ->middleware('signed')
        ->name('account.setup.store');

    Route::post('set-password', SetPasswordController::class)
        ->middleware('auth:sanctum')
        ->name('password.set');

    Route::put('password', PasswordController::class)
        ->middleware('auth:sanctum')
        ->name('password.update');

    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['auth:sanctum', 'signed'])
        ->name('verification.verify');

    Route::post('email/verification-notification', EmailVerificationNotificationController::class)
        ->middleware(['auth:sanctum', 'throttle:6,1'])
        ->name('verification.send');

    Route::get('contract-confirmation/{contract_number}', [ContractConfirmationController::class, 'show'])
        ->middleware('signed')
        ->whereNumber('contract_number')
        ->name('contract.confirm');

    Route::post('contract-confirmation/{contract_number}', [ContractConfirmationController::class, 'store'])
        ->middleware('signed')
        ->whereNumber('contract_number')
        ->name('contract.confirm.store');
});
