<?php

declare(strict_types=1);

use App\Http\Controllers\Customer\ChangeRequestController;
use App\Http\Controllers\Customer\ContractController;
use App\Http\Controllers\Customer\ContractFileController;
use App\Http\Controllers\Customer\MailboxController;
use App\Http\Controllers\Customer\MailboxFileController;
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

// Phase 5: change requests + mailbox — appended as a second group with the
// same prefix/middleware so the block above stays untouched.
Route::prefix('customers/{user}')
    ->whereNumber('user')
    ->middleware(['auth:sanctum', 'password.set', 'verified', 'can:actFor,user'])
    ->group(function (): void {
        // The `contact` enum case is the mailbox chat, not a change request,
        // so it is excluded from the route constraint (404).
        Route::post('contracts/{contractNumber}/change-requests/{type}', [ChangeRequestController::class, 'store'])
            ->whereNumber('contractNumber')
            ->whereIn('type', [
                'bank',
                'billing-address',
                'delivery-address',
                'contact-data',
                'installment',
                'meter-count',
                'termination',
                'revocation',
            ])
            ->name('customer.change-requests.store');

        Route::get('postfach', [MailboxController::class, 'index'])
            ->name('customer.mailbox.index');

        Route::post('postfach', [MailboxController::class, 'store'])
            ->name('customer.mailbox.store');

        Route::get('postfach/files/customer/{fileId}', [MailboxFileController::class, 'customer'])
            ->whereNumber('fileId')
            ->name('customer.mailbox.customer-files.show');

        Route::get('postfach/files/company/{fileId}', [MailboxFileController::class, 'company'])
            ->whereNumber('fileId')
            ->name('customer.mailbox.company-files.show');
    });
