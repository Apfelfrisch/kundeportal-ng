<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Models\ContractToUser;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Quick search of the old company start page. Both endpoints only verify
 * local records — a contract is "found" when an assignment (confirmed or
 * not) exists, a user when the id exists.
 */
final class SearchController
{
    public function contract(Request $request): JsonResponse
    {
        $request->validate([
            'contract_number' => ['required', 'integer'],
        ]);

        $contractNumber = $request->integer('contract_number');

        $assignment = ContractToUser::withUnconfirmed()
            ->where('contract_number', $contractNumber)
            ->first();

        if ($assignment === null) {
            abort(404, "Keinen Vertrag mit der Nummer {$contractNumber} gefunden.");
        }

        return response()->json([
            'data' => [
                'contract_number' => $assignment->contract_number,
                'user_id' => $assignment->user_id,
            ],
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => ['required', 'integer'],
        ]);

        $userId = $request->integer('user_id');

        $user = User::query()->find($userId);

        if ($user === null) {
            abort(404, "Kein Benutzer mit der Stammnummer {$userId} gefunden.");
        }

        return response()->json([
            'data' => [
                'user_id' => $user->id,
            ],
        ]);
    }
}
