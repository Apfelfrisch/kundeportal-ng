<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class EmailVerificationNotificationController
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Ihre E-Mail-Adresse ist bereits bestätigt.']);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'E-Mail wurde gesendet.']);
    }
}
