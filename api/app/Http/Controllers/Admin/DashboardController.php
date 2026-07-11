<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\CustomerMessageStatus;
use App\Models\CustomerMessage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Counts of the old company start page: open tickets, tickets in process
 * and the acting admin's own in-process tickets.
 */
final class DashboardController
{
    public function __invoke(Request $request): JsonResponse
    {
        $admin = $request->user();
        abort_unless($admin instanceof User, 401);

        return response()->json([
            'data' => [
                'tickets' => [
                    'open' => CustomerMessage::query()
                        ->where('status', CustomerMessageStatus::UnProcessed)
                        ->count(),
                    'in_process' => CustomerMessage::query()
                        ->where('status', CustomerMessageStatus::InProcess)
                        ->count(),
                    'mine' => CustomerMessage::query()
                        ->where('status', CustomerMessageStatus::InProcess)
                        ->where('caseworker', $admin->id)
                        ->count(),
                ],
            ],
        ]);
    }
}
