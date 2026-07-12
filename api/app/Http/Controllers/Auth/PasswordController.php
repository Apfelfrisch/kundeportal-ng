<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Models\User;
use App\Services\ProfileService;
use Illuminate\Http\JsonResponse;

/**
 * Password change for authenticated users; requires the current password.
 * Firing PasswordReset lets the SendPasswordChangedMail listener inform
 * the user, exactly like the broker based reset flow.
 */
final readonly class PasswordController
{
    public function __construct(
        private ProfileService $profiles,
    ) {}

    public function __invoke(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        $this->profiles->changePassword($user, $request->string('password')->value());

        return response()->json(['message' => 'Ihr Passwort wurde aktualisiert.']);
    }
}
