<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\CompanyMessageController;
use App\Http\Controllers\Admin\ContractAssignmentController;
use App\Http\Controllers\Admin\ContractController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\ProfileController;
use App\Http\Controllers\Admin\SearchController;
use App\Http\Controllers\Admin\TicketController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

// Admin area (/api/admin/*). Like the old AdminMiddleware routes, staff only
// needs auth + the admin flag — no password.set / verified middleware, so an
// admin who just changed their email address is not locked out.
Route::prefix('admin')
    ->middleware(['auth:sanctum', 'admin'])
    ->group(function (): void {
        Route::get('dashboard', DashboardController::class)
            ->name('admin.dashboard');

        Route::get('contracts', [ContractController::class, 'index'])
            ->name('admin.contracts.index');

        Route::post('contracts/{contractNumber}/resend-confirmation', [ContractController::class, 'resendConfirmation'])
            ->whereNumber('contractNumber')
            ->name('admin.contracts.resend-confirmation');

        Route::get('users', [UserController::class, 'index'])
            ->name('admin.users.index');

        Route::post('users', [UserController::class, 'store'])
            ->name('admin.users.store');

        Route::delete('users/{user}', [UserController::class, 'destroy'])
            ->whereNumber('user')
            ->name('admin.users.destroy');

        Route::post('users/{user}/setup-mail', [UserController::class, 'sendSetupMail'])
            ->whereNumber('user')
            ->name('admin.users.setup-mail');

        Route::post('contract-assignments', [ContractAssignmentController::class, 'store'])
            ->name('admin.contract-assignments.store');

        // {contractToUser} stays an int parameter: implicit binding would
        // apply the ConfirmedScope and hide unconfirmed assignments.
        Route::delete('contract-assignments/{contractToUser}', [ContractAssignmentController::class, 'destroy'])
            ->whereNumber('contractToUser')
            ->name('admin.contract-assignments.destroy');

        Route::get('tickets', [TicketController::class, 'index'])
            ->name('admin.tickets.index');

        Route::put('tickets/{customerMessage}/status', [TicketController::class, 'updateStatus'])
            ->whereNumber('customerMessage')
            ->name('admin.tickets.status');

        Route::get('outbox', [CompanyMessageController::class, 'index'])
            ->name('admin.outbox.index');

        Route::post('messages', [CompanyMessageController::class, 'store'])
            ->name('admin.messages.store');

        Route::delete('messages/{companyMessage}', [CompanyMessageController::class, 'destroy'])
            ->whereNumber('companyMessage')
            ->name('admin.messages.destroy');

        Route::get('search/contract', [SearchController::class, 'contract'])
            ->name('admin.search.contract');

        Route::get('search/user', [SearchController::class, 'user'])
            ->name('admin.search.user');

        Route::get('profile', [ProfileController::class, 'show'])
            ->name('admin.profile.show');

        Route::put('profile/email', [ProfileController::class, 'updateEmail'])
            ->name('admin.profile.email.update');

        Route::put('profile/password', [ProfileController::class, 'updatePassword'])
            ->name('admin.profile.password.update');
    });
