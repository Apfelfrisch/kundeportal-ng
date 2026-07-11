<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Http\Resources\ContractResource;
use App\Http\Resources\ContractSummaryResource;
use App\Models\User;
use App\Services\ContractService;
use App\Support\TenantConfig;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class ContractController
{
    public function __construct(
        private readonly ContractService $contractService,
        private readonly TenantConfig $tenant,
    ) {}

    /**
     * All contracts of the customer's confirmed assignments.
     */
    public function index(User $user): AnonymousResourceCollection
    {
        return ContractSummaryResource::collection($this->contractService->listForUser($user));
    }

    /**
     * A single contract, guarded by the confirmed-assignment rule.
     */
    public function show(Request $request, User $user, int $contractNumber): ContractResource
    {
        $actingUser = $request->user();

        abort_unless($actingUser instanceof User, 401);

        return new ContractResource(
            $this->contractService->findForUser($actingUser, $user, $contractNumber),
            $this->tenant,
        );
    }
}
