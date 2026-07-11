<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\MailLogType;
use App\Notifications\Concerns\BuildsTenantMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to the OLD address after the account email was changed so the
 * previous owner is informed about the change.
 */
final class EmailChangedNotification extends Notification implements ShouldQueue
{
    use BuildsTenantMail;
    use Queueable;

    public function __construct(
        public readonly string $newEmail,
    ) {}

    public function toMail(object $notifiable): MailMessage
    {
        return $this->tenantMail(MailLogType::EmailChanged, 'E-Mail-Adresse geändert')
            ->markdown('mail.email-changed', [
                ...$this->tenantViewData(),
                'newEmail' => $this->newEmail,
            ]);
    }
}
