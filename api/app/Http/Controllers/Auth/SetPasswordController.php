<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Requests\Auth\SetPasswordRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

/**
 * Lets an authenticated but still passwordless user choose their initial
 * password. Users who already have one must use the password update
 * endpoint (which verifies the current password).
 */
final class SetPasswordController
{
    public function __invoke(SetPasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        if ($user->hasPassword()) {
            abort(409, 'Es ist bereits ein Passwort gesetzt. Bitte ändern Sie Ihr Passwort über die Passwort-ändern-Funktion.');
        }

        $user->password = Hash::make($request->string('password')->value());
        $user->save();

        if (! $user->hasVerifiedEmail()) {
            $user->sendEmailVerificationNotification();
        }

        return response()->json(AuthUserPayload::make($user));
    }
}
