<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Enums\ChangeRequestType;
use App\Http\Resources\CustomerMessageResource;
use App\Models\User;
use App\Services\ChangeRequestService;
use App\Services\ContractService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * One endpoint for all eight change-request forms, replacing the old
 * per-type ChangeData controllers. The type is enum-bound in the route,
 * validation rules are resolved per type by the ChangeRequestService.
 */
final class ChangeRequestController
{
    public function __construct(
        private readonly ContractService $contractService,
        private readonly ChangeRequestService $changeRequestService,
    ) {}

    public function store(Request $request, User $user, int $contractNumber, ChangeRequestType $type): JsonResponse
    {
        $actingUser = $request->user();

        abort_unless($actingUser instanceof User, 401);

        // Authorizes the contract access (403/404) and provides the contract
        // context the installment range and termination date checks need.
        $contract = $this->contractService->findForUser($actingUser, $user, $contractNumber);

        $this->changeRequestService->validate($request, $type, $contract);

        $message = $this->changeRequestService->store($actingUser, $user, $contract, $type, $request);

        return response()->json([
            'data' => new CustomerMessageResource($message),
            'info' => $this->changeRequestService->infoText($user),
        ], 201);
    }
}
