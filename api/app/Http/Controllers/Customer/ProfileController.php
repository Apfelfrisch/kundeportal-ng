<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Requests\Customer\UpdateProfileEmailRequest;
use App\Models\User;
use App\Services\ProfileService;
use Illuminate\Http\JsonResponse;

/**
 * Customer profile, ported from the old ProfileController. An email change
 * revokes the verification, notifies the OLD address and sends a fresh
 * verification mail to the new one.
 */
final readonly class ProfileController
{
    public function __construct(
        private ProfileService $profiles,
    ) {}

    public function show(User $user): JsonResponse
    {
        return $this->profileResponse($user);
    }

    public function updateEmail(UpdateProfileEmailRequest $request, User $user): JsonResponse
    {
        $this->profiles->changeEmail($user, $request->string('email')->value());

        return $this->profileResponse(
            $user,
            'Ihre E-Mail-Adresse wurde aktualisiert. Bitte bestätigen Sie die neue E-Mail-Adresse. Hierzu haben wir Ihnen eine E-Mail an die neue Adresse geschickt.',
        );
    }

    public function updatePassword(UpdatePasswordRequest $request, User $user): JsonResponse
    {
        $this->profiles->changePassword($user, $request->string('password')->value());

        return $this->profileResponse($user, 'Ihr Passwort wurde aktualisiert.');
    }

    private function profileResponse(User $user, ?string $message = null): JsonResponse
    {
        $payload = [
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'customer_number' => $user->customer_number,
                'email_verified' => $user->hasVerifiedEmail(),
                'password_set' => $user->hasPassword(),
            ],
        ];

        if ($message !== null) {
            $payload['message'] = $message;
        }

        return response()->json($payload);
    }
}
