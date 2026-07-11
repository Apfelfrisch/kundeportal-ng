<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Http\Requests\Customer\UpdateProfileEmailRequest;
use App\Http\Requests\Customer\UpdateProfilePasswordRequest;
use App\Models\User;
use App\Notifications\EmailChangedNotification;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

/**
 * Customer profile, ported from the old ProfileController. An email change
 * revokes the verification, notifies the OLD address and sends a fresh
 * verification mail to the new one.
 */
final class ProfileController
{
    public function show(User $user): JsonResponse
    {
        return $this->profileResponse($user);
    }

    public function updateEmail(UpdateProfileEmailRequest $request, User $user): JsonResponse
    {
        $oldEmail = $user->email;

        $user->email = $request->string('email')->value();
        $user->email_verified_at = null;
        $user->save();

        Notification::route('mail', $oldEmail)
            ->notify(new EmailChangedNotification($user->email));

        $user->sendEmailVerificationNotification();

        return $this->profileResponse(
            $user,
            'Ihre E-Mail-Adresse wurde aktualisiert. Bitte bestätigen Sie die neue E-Mail-Adresse. Hierzu haben wir Ihnen eine E-Mail an die neue Adresse geschickt.',
        );
    }

    public function updatePassword(UpdateProfilePasswordRequest $request, User $user): JsonResponse
    {
        $user->password = Hash::make($request->string('password')->value());
        $user->save();

        // The SendPasswordChangedMail listener informs the user, exactly
        // like the broker based reset flow and the auth password endpoint.
        event(new PasswordReset($user));

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
