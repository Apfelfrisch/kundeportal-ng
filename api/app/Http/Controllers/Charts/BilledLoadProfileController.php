<?php

declare(strict_types=1);

namespace App\Http\Controllers\Charts;

use App\Http\Controllers\Charts\Concerns\ResolvesRequestedDate;
use App\Http\Resources\Charts\BilledLoadProfileDayResource;
use App\Models\User;
use App\Services\ContractService;
use App\Services\LoadProfileService;
use Illuminate\Http\Request;

/**
 * Billed (tariff) load profile chart data, replacing the old
 * BilledContractLoadProfileController.
 */
final class BilledLoadProfileController
{
    use ResolvesRequestedDate;

    public function __construct(
        private readonly ContractService $contractService,
        private readonly LoadProfileService $loadProfileService,
    ) {}

    public function __invoke(Request $request, User $user, int $contractNumber): BilledLoadProfileDayResource
    {
        $actingUser = $request->user();

        abort_unless($actingUser instanceof User, 401);

        // Confirmed-assignment (or admin) check — the contract data itself
        // is not needed here.
        $this->contractService->ensureUserCanAccess($actingUser, $user, $contractNumber);

        $day = $this->loadProfileService->billedDay($contractNumber, $this->requestedDate($request));

        return new BilledLoadProfileDayResource($day['date'], $day['entries']);
    }
}
