<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CompanyMessage;
use App\Models\CustomerMessage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One entry of the merged mailbox thread. The shape mirrors the old chat
 * view's unified message array: company messages carry a subject and their
 * read timestamp, customer messages expose the chat text from `data.message`
 * (change-request tickets fall back to '-' exactly like the old getData()).
 */
final class MailboxThreadResource extends JsonResource
{
    public function __construct(
        private readonly CompanyMessage|CustomerMessage $message,
    ) {
        parent::__construct($message);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        if ($this->message instanceof CompanyMessage) {
            return [
                'id' => $this->message->id,
                'direction' => 'company',
                'form_type' => null,
                'subject' => $this->message->subject,
                'message' => $this->message->message,
                'created_at' => $this->message->created_at?->toIso8601String(),
                'read_at' => $this->message->read_at?->toIso8601String(),
                'files' => $this->message->uploadedFiles
                    ->map(static fn ($file): MailboxFileResource => new MailboxFileResource($file))
                    ->all(),
            ];
        }

        $data = $this->message->data;

        return [
            'id' => $this->message->id,
            'direction' => 'customer',
            'form_type' => $this->message->form_type,
            'subject' => null,
            'message' => array_key_exists('message', $data) ? $data['message'] : '-',
            'created_at' => $this->message->created_at?->toIso8601String(),
            'read_at' => null,
            'files' => $this->message->uploadedFiles
                ->map(static fn ($file): MailboxFileResource => new MailboxFileResource($file))
                ->all(),
        ];
    }
}
