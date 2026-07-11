<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\MailLogType;
use App\Models\User;
use App\Notifications\Concerns\BuildsTenantMail;
use App\Support\SignedSpaUrl;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

final class AccountSetupNotification extends Notification implements ShouldQueue
{
    use BuildsTenantMail;
    use Queueable;

    public function toMail(User $notifiable): MailMessage
    {
        $emailHash = sha1($notifiable->getEmailForVerification());

        // user_id/email_hash mirror the path parameters into the query string
        // so the SPA can rebuild the exact signed API URL from the query alone.
        $signedUrl = URL::temporarySignedRoute('account.setup', now()->addDays(7), [
            'user' => $notifiable->getKey(),
            'hash' => $emailHash,
            'user_id' => $notifiable->getKey(),
            'email_hash' => $emailHash,
        ]);

        return $this->tenantMail(MailLogType::AccountSetup, 'Account einrichten')
            ->markdown('mail.account-setup', [
                ...$this->tenantViewData(),
                'url' => SignedSpaUrl::toFrontend($signedUrl, '/account/einrichten'),
            ]);
    }
}
