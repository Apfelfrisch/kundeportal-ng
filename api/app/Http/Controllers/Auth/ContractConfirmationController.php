<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Models\ContractToUser;
use App\Models\User;
use Illuminate\Http\JsonResponse;

/**
 * Public, signed contract-confirmation flow: when a staff member links a
 * contract to a user whose email differs from the contract's, the contract
 * owner receives a signed link to approve the assignment.
 */
final class ContractConfirmationController
{
    public function show(int $contract_number): JsonResponse
    {
        $assignment = $this->findAssignment($contract_number);

        if ($assignment->confirmed) {
            return response()->json([
                'data' => [
                    'contract_number' => $assignment->contract_number,
                    'confirmed' => true,
                ],
            ]);
        }

        $user = User::query()->findOrFail($assignment->user_id);

        return response()->json([
            'data' => [
                'contract_number' => $assignment->contract_number,
                'user_name' => $user->name,
                'confirmed' => false,
            ],
        ]);
    }

    public function store(int $contract_number): JsonResponse
    {
        $assignment = $this->findAssignment($contract_number);

        if (! $assignment->confirmed) {
            $assignment->update(['confirmed' => true]);
        }

        return response()->json([
            'data' => [
                'contract_number' => $assignment->contract_number,
                'confirmed' => true,
            ],
        ]);
    }

    private function findAssignment(int $contractNumber): ContractToUser
    {
        $assignment = ContractToUser::withUnconfirmed()
            ->where('contract_number', $contractNumber)
            ->first();

        if ($assignment === null) {
            abort(404, 'Zu diesem Vertrag liegt keine Zuweisung vor.');
        }

        return $assignment;
    }
}
