<?php

declare(strict_types=1);

namespace App\Http\Controllers\Charts;

use App\Domain\Usage\UsagePeriod;
use App\Http\Resources\Charts\UsageResource;
use App\Models\User;
use App\Services\ContractService;
use App\Services\UsageService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Usage of one day/month/year for the usage page of the app — or, with
 * `from` and `until` (inclusive days), of a custom window such as an
 * invoice period.
 */
final class UsageController
{
    public function __construct(
        private readonly ContractService $contractService,
        private readonly UsageService $usageService,
    ) {}

    public function __invoke(Request $request, User $user, int $contractNumber): UsageResource
    {
        $actingUser = $request->user();

        abort_unless($actingUser instanceof User, 401);

        $this->contractService->ensureUserCanAccess($actingUser, $user, $contractNumber);

        /** @var array{period?: string, date?: string, from?: string, until?: string} $validated */
        $validated = $request->validate([
            'period' => ['sometimes', Rule::enum(UsagePeriod::class)],
            'date' => ['sometimes', 'date'],
            'from' => ['sometimes', 'required_with:until', 'date'],
            'until' => ['sometimes', 'required_with:from', 'date', 'after_or_equal:from'],
        ]);

        if (isset($validated['from'], $validated['until'])) {
            return new UsageResource($this->usageService->range(
                $contractNumber,
                CarbonImmutable::parse($validated['from']),
                CarbonImmutable::parse($validated['until'])->addDay(),
            ));
        }

        return new UsageResource($this->usageService->usage(
            $contractNumber,
            UsagePeriod::tryFrom($validated['period'] ?? '') ?? UsagePeriod::Month,
            isset($validated['date']) ? CarbonImmutable::parse($validated['date']) : null,
        ));
    }
}
