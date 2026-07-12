<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Http\Resources\MailboxFileResource;
use App\Models\CompanyMessage;
use App\Models\CompanyUploadedFile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Outbox row: a staff message with its attachments and the recipient.
 */
final class CompanyMessageResource extends JsonResource
{
    public function __construct(
        private readonly CompanyMessage $message,
    ) {
        parent::__construct($message);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $recipient = $this->message->user;

        return [
            'id' => $this->message->id,
            'subject' => $this->message->subject,
            'message' => $this->message->message,
            'contract_number' => $this->message->contract_number,
            'read_at' => $this->message->read_at?->toISOString(),
            'created_at' => $this->message->created_at?->toISOString(),
            'recipient' => $recipient === null ? null : [
                'id' => $recipient->id,
                'name' => $recipient->name,
                'email' => $recipient->email,
            ],
            'files' => $this->message->uploadedFiles
                ->map(static fn (CompanyUploadedFile $file): MailboxFileResource => new MailboxFileResource($file))
                ->values()
                ->all(),
        ];
    }
}
