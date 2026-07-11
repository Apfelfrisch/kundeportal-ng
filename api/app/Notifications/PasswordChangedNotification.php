<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\MailLogType;
use App\Notifications\Concerns\BuildsTenantMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class PasswordChangedNotification extends Notification implements ShouldQueue
{
    use BuildsTenantMail;
    use Queueable;

    public function toMail(object $notifiable): MailMessage
    {
        return $this->tenantMail(MailLogType::PasswordChanged, 'Passwort geändert')
            ->markdown('mail.password-changed', $this->tenantViewData());
    }
}
