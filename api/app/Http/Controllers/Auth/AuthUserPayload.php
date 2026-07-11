<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Models\User;

/**
 * The session/user JSON shape shared by login, session probe and the
 * account-setup flow. The SPA routes on the three boolean flags.
 */
final readonly class AuthUserPayload
{
    /**
     * @return array{data: array<string, mixed>}
     */
    public static function make(User $user): array
    {
        return [
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'customer_number' => $user->customer_number,
                'admin' => $user->isAdministrator(),
                'email_verified' => $user->hasVerifiedEmail(),
                'password_set' => $user->hasPassword(),
            ],
        ];
    }
}
