<?php

declare(strict_types=1);

namespace App\Notifications\Concerns;

use App\Enums\MailLogType;
use App\Support\TenantConfig;
use Illuminate\Notifications\Messages\MailMessage;
use Symfony\Component\Mime\Email;

/**
 * Shared tenant-aware mail plumbing: sender, subject suffix, the machine
 * readable X-Mail-Type header and the greeting/adoption view data every
 * markdown mail view expects.
 */
trait BuildsTenantMail
{
    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    private function tenant(): TenantConfig
    {
        return app(TenantConfig::class);
    }

    private function tenantMail(MailLogType $type, string $title): MailMessage
    {
        $tenant = $this->tenant();

        return (new MailMessage)
            ->from($tenant->contactEmail(), $tenant->companyNameLong())
            ->subject($title.' | '.$tenant->companyName().' Kundenportal')
            ->withSymfonyMessage(static function (Email $message) use ($type): void {
                $message->getHeaders()->addTextHeader('X-Mail-Type', $type->value);
            });
    }

    /**
     * @return array<string, string>
     */
    private function tenantViewData(): array
    {
        $tenant = $this->tenant();

        $contactWebsite = $tenant->contact['website'] ?? '';

        return [
            'greeting' => $tenant->mail['greeting'] ?? '',
            'adoption' => $tenant->mail['adoption'] ?? '',
            'adoptionName' => $tenant->mail['adoption-name'] ?? '',
            'companyName' => $tenant->companyName(),
            'contactWebsite' => is_string($contactWebsite) ? $contactWebsite : '',
        ];
    }
}
