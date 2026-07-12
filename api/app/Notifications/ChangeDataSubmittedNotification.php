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
 * Sent on demand to the COMPANY contact address whenever a customer submits
 * a change request (old ChangeDataSubmitted notification).
 */
final class ChangeDataSubmittedNotification extends Notification implements ShouldQueue
{
    use BuildsTenantMail;
    use Queueable;

    public function __construct(
        public readonly User $customer,
        public readonly int $contractNumber,
        public readonly string $changeType,
    ) {}

    public function toMail(object $notifiable): MailMessage
    {
        $url = SpaUrl::to('/intern/tickets');

        return $this->tenantMail(MailLogType::ChangeData, 'Neue Änderungsmeldung: '.$this->changeType)
            ->markdown('mail.change-data-submitted', [
                'customerName' => $this->customer->name,
                'customerNumber' => $this->customer->customer_number,
                'contractNumber' => $this->contractNumber,
                'changeType' => $this->changeType,
                'url' => $url,
            ]);
    }
}
