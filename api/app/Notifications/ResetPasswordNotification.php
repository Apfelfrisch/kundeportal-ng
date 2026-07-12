<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\MailLogType;
use App\Models\User;
use App\Notifications\Concerns\BuildsTenantMail;
use App\Support\SpaUrl;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use SensitiveParameter;

final class ResetPasswordNotification extends Notification implements ShouldQueue
{
    use BuildsTenantMail;
    use Queueable;

    public function __construct(
        #[SensitiveParameter]
        public readonly string $token,
    ) {}

    public function toMail(User $notifiable): MailMessage
    {
        $url = SpaUrl::to('/passwort-zuruecksetzen')
            .'?token='.$this->token
            .'&email='.urlencode($notifiable->getEmailForPasswordReset());

        return $this->tenantMail(MailLogType::PasswordReset, 'Passwort zurück setzen')
            ->markdown('mail.password-reset', [
                ...$this->tenantViewData(),
                'url' => $url,
                'expireMinutes' => (string) config()->integer('auth.passwords.users.expire', 60),
            ]);
    }
}
