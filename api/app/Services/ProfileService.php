<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Notifications\EmailChangedNotification;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

/**
 * Shared email/password change flow of the customer and admin profile
 * endpoints: an email change revokes the verification, notifies the OLD
 * address and sends a fresh verification mail to the new one.
 */
final readonly class ProfileService
{
    public function changeEmail(User $user, string $email): void
    {
        $oldEmail = $user->email;

        $user->email = $email;
        $user->email_verified_at = null;
        $user->save();

        Notification::route('mail', $oldEmail)
            ->notify(new EmailChangedNotification($user->email));

        $user->sendEmailVerificationNotification();
    }

    public function changePassword(User $user, string $password): void
    {
        $user->password = Hash::make($password);
        $user->save();

        // The SendPasswordChangedMail listener informs the user, exactly
        // like the broker based reset flow and the auth password endpoint.
        event(new PasswordReset($user));
    }
}
