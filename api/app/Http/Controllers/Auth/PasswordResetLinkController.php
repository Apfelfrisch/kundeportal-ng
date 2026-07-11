<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Requests\Auth\ForgotPasswordRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;

final class PasswordResetLinkController
{
    /**
     * Always answers with the same generic message so the endpoint cannot
     * be used to probe which email addresses have an account.
     */
    public function store(ForgotPasswordRequest $request): JsonResponse
    {
        Password::sendResetLink($request->only('email'));

        return response()->json([
            'message' => 'Wenn ein Konto mit dieser E-Mail-Adresse existiert, haben wir Ihnen einen Link zum Zurücksetzen des Passworts geschickt.',
        ]);
    }
}
