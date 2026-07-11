<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Schedule;

// Database queue drained periodically instead of a long-running worker
// (port of the old app:process-queue every-2-minutes pattern).
Schedule::command('queue:work --stop-when-empty')
    ->everyTwoMinutes()
    ->withoutOverlapping();

// Spot market prices are only needed by tenants with dynamic tariffs.
if ((bool) config('company.app.dynamic-electric-prices')) {
    Schedule::command('app:fetch-market-prices')->everyTenMinutes();
}
