<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Models\User;
use App\Notifications\PasswordChangedNotification;
use Illuminate\Auth\Events\PasswordReset;

/**
 * Informs the user by mail whenever their password was changed — both via
 * the reset-password broker flow and via the authenticated password update
 * endpoint (which fires the same event).
 */
final class SendPasswordChangedMail
{
    public function handle(PasswordReset $event): void
    {
        $user = $event->user;

        if ($user instanceof User) {
            $user->notify(new PasswordChangedNotification);
        }
    }
}
