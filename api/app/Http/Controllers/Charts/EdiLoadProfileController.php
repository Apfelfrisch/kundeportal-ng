<?php

declare(strict_types=1);

namespace App\Http\Controllers\Charts;

use App\Http\Controllers\Charts\Concerns\ResolvesRequestedDate;
use App\Http\Resources\Charts\EdiLoadProfileDayResource;
use App\Models\User;
use App\Services\ContractService;
use App\Services\LoadProfileService;
use Illuminate\Http\Request;

/**
 * EDI (smart meter) load profile chart data, replacing the old
 * ContractEdiLoadProfileController.
 */
final class EdiLoadProfileController
{
    use ResolvesRequestedDate;

    public function __construct(
        private readonly ContractService $contractService,
        private readonly LoadProfileService $loadProfileService,
    ) {}

    public function __invoke(Request $request, User $user, int $contractNumber): EdiLoadProfileDayResource
    {
        $actingUser = $request->user();

        abort_unless($actingUser instanceof User, 401);

        // Confirmed-assignment (or admin) check — the contract data itself
        // is not needed here.
        $this->contractService->ensureUserCanAccess($actingUser, $user, $contractNumber);

        $day = $this->loadProfileService->ediDay($contractNumber, $this->requestedDate($request));

        return new EdiLoadProfileDayResource($day['date'], $day['entries']);
    }
}
