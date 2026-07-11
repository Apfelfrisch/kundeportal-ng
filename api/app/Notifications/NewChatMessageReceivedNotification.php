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
 * Sent to the CUSTOMER when the company writes a new mailbox message
 * (old NewCustomerMessage notification, subject "Neue Nachricht").
 */
final class NewChatMessageReceivedNotification extends Notification implements ShouldQueue
{
    use BuildsTenantMail;
    use Queueable;

    public function __construct(
        public readonly string $linkToMessage,
    ) {}

    public function toMail(object $notifiable): MailMessage
    {
        return $this->tenantMail(MailLogType::ChatMessage, 'Neue Nachricht')
            ->markdown('mail.new-chat-message-received', [
                ...$this->tenantViewData(),
                'url' => $this->linkToMessage,
            ]);
    }
}
