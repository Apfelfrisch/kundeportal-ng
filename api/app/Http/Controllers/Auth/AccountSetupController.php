<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Requests\Auth\AccountSetupRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

/**
 * Invite flow: staff-created users receive a temporary signed link (7 days)
 * with which they choose their password. Completing the setup also verifies
 * the email address (the link was delivered to it) and logs the user in.
 */
final class AccountSetupController
{
    public function show(User $user, string $hash): JsonResponse
    {
        $this->authorizeHash($user, $hash);
        $this->ensureNotAlreadySetUp($user);

        return response()->json([
            'data' => [
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    public function store(AccountSetupRequest $request, User $user, string $hash): JsonResponse
    {
        $this->authorizeHash($user, $hash);
        $this->ensureNotAlreadySetUp($user);

        $user->password = Hash::make($request->string('password')->value());
        $user->email_verified_at = now();
        $user->save();

        Auth::guard('web')->login($user);

        $request->session()->regenerate();

        return response()->json(AuthUserPayload::make($user));
    }

    private function authorizeHash(User $user, string $hash): void
    {
        abort_unless(hash_equals(sha1($user->getEmailForVerification()), $hash), 403);
    }

    private function ensureNotAlreadySetUp(User $user): void
    {
        if ($user->hasPassword() && $user->hasVerifiedEmail()) {
            abort(410, 'Ihr Account ist bereits eingerichtet. Bitte melden Sie sich an.');
        }
    }
}
