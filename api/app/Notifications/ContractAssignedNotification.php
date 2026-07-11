<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\MailLogType;
use App\Notifications\Concerns\BuildsTenantMail;
use App\Support\SignedSpaUrl;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

/**
 * Sent to the email address stored on the KVS contract when a staff member
 * links that contract to a portal user whose address differs. The signed
 * link lets the contract owner confirm the assignment.
 */
final class ContractAssignedNotification extends Notification implements ShouldQueue
{
    use BuildsTenantMail;
    use Queueable;

    public function __construct(
        public readonly int $contractNumber,
        public readonly string $userName,
    ) {}

    public function toMail(object $notifiable): MailMessage
    {
        // "contract" mirrors the path parameter into the query string so the
        // SPA can rebuild the exact signed API URL from the query alone.
        $signedUrl = URL::signedRoute('contract.confirm', [
            'contract_number' => $this->contractNumber,
            'contract' => $this->contractNumber,
        ]);

        return $this->tenantMail(MailLogType::ContractAssigned, 'Vertrag im Kundenportal verknüpft')
            ->markdown('mail.contract-assigned', [
                ...$this->tenantViewData(),
                'contractNumber' => (string) $this->contractNumber,
                'userName' => $this->userName,
                'confirmUrl' => SignedSpaUrl::toFrontend($signedUrl, '/vertrag-bestaetigen'),
            ]);
    }
}
