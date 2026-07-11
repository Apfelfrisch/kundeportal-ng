<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

/**
 * Password change for authenticated users; requires the current password.
 * Firing PasswordReset lets the SendPasswordChangedMail listener inform
 * the user, exactly like the broker based reset flow.
 */
final class PasswordController
{
    public function __invoke(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        $user->password = Hash::make($request->string('password')->value());
        $user->save();

        event(new PasswordReset($user));

        return response()->json(['message' => 'Ihr Passwort wurde aktualisiert.']);
    }
}
