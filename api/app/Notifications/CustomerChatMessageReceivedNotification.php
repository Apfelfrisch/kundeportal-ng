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

/**
 * Sent on demand to the COMPANY contact address when a customer writes a
 * chat message in the mailbox (old CustomerChatMessageReceived).
 */
final class CustomerChatMessageReceivedNotification extends Notification implements ShouldQueue
{
    use BuildsTenantMail;
    use Queueable;

    public function __construct(
        public readonly User $customer,
        public readonly string $chatMessage,
    ) {}

    public function toMail(object $notifiable): MailMessage
    {
        $url = SpaUrl::to('/intern/tickets');

        return $this->tenantMail(MailLogType::ChatMessage, 'Neue Chatnachricht vom Kunden')
            ->markdown('mail.customer-chat-message-received', [
                'customerName' => $this->customer->name,
                'chatMessage' => $this->chatMessage,
                'url' => $url,
            ]);
    }
}
