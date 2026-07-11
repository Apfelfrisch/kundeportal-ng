<?php

declare(strict_types=1);

namespace App\Http\Controllers\Charts\Concerns;

use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

/**
 * The optional `?date=` day pager parameter shared by all chart endpoints.
 * An invalid date yields a 422 instead of the old app's error page.
 */
trait ResolvesRequestedDate
{
    private function requestedDate(Request $request): ?CarbonImmutable
    {
        /** @var array{date?: string} $validated */
        $validated = $request->validate([
            'date' => ['sometimes', 'date'],
        ]);

        return isset($validated['date'])
            ? CarbonImmutable::parse($validated['date'])
            : null;
    }
}
