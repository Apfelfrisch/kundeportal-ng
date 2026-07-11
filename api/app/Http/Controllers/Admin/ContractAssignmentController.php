<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Requests\Admin\StoreContractAssignmentRequest;
use App\Models\User;
use App\Services\ContractAssignmentService;
use Illuminate\Http\JsonResponse;

/**
 * Linking contracts to users — the old CustomerUserController actions
 * assignContract and removeContractAssignment.
 */
final readonly class ContractAssignmentController
{
    public function __construct(
        private ContractAssignmentService $assignments,
    ) {}

    public function store(StoreContractAssignmentRequest $request): JsonResponse
    {
        $user = User::query()->findOrFail($request->integer('user_id'));

        $assignment = $this->assignments->assign($user, $request->integer('contract_number'));

        return response()->json([
            'data' => [
                'id' => $assignment->id,
                'user_id' => $assignment->user_id,
                'contract_number' => $assignment->contract_number,
                'confirmed' => $assignment->confirmed,
            ],
            'message' => "Vertrag {$assignment->contract_number} wurde dem Benutzer {$user->name} zugewiesen.",
        ], 201);
    }

    /**
     * The parameter stays an int on purpose: implicit binding would apply the
     * ConfirmedScope and 404 for unconfirmed assignments.
     */
    public function destroy(int $contractToUser): JsonResponse
    {
        $contractNumber = $this->assignments->removeAssignment($contractToUser);

        return response()->json([
            'message' => "Zuweisung für Vertrag {$contractNumber} wurde entfernt.",
        ]);
    }
}
