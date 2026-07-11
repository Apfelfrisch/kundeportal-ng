<?php

declare(strict_types=1);

namespace App\Http\Requests\Mailbox;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

/**
 * Rules ported from the old CustomerMailboxChatController::store() (message
 * max 5000, files jpg/jpeg/png/pdf up to 10 MB) plus the bot-check honeypot.
 */
final class StoreMailboxMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'message' => ['required_without:files', 'nullable', 'string', 'max:5000'],
            'files' => ['nullable', 'array'],
            'files.*' => ['file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
            'bot-check' => ['prohibited'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'files.*.mimes' => 'Datei konnte nicht gespeichert werden. Die Datei muss vom Typ JPG, PNG oder PDF sein.',
            'files.*.max' => 'Datei konnte nicht gespeichert werden. Die Datei darf nicht größer als 10 MB sein.',
            'files.*.file' => 'Datei konnte nicht gespeichert werden. Die Datei ist ungültig.',
            'message.required_without' => 'Bitte eine Nachricht eingeben oder eine Datei anhängen.',
            'bot-check.prohibited' => 'Ihre Anfrage konnte nicht verarbeitet werden.',
        ];
    }

    public function messageText(): ?string
    {
        $message = $this->validated('message');

        return is_string($message) && $message !== '' ? $message : null;
    }

    /**
     * @return list<UploadedFile>
     */
    public function uploadedFiles(): array
    {
        $files = $this->file('files');

        if ($files === null) {
            return [];
        }

        if (! is_array($files)) {
            return [$files];
        }

        return array_values($files);
    }
}
