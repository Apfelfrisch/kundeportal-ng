<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Shared validation for mailbox file uploads (customer chat and staff
 * outbox): jpg/jpeg/png/pdf up to 10 MB, with the German error messages.
 */
final class MailboxFileRules
{
    /**
     * @return array<string, list<string>>
     */
    public static function rules(): array
    {
        return [
            'files' => ['nullable', 'array'],
            'files.*' => ['file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function messages(): array
    {
        return [
            'files.*.mimes' => 'Datei konnte nicht gespeichert werden. Die Datei muss vom Typ JPG, PNG oder PDF sein.',
            'files.*.max' => 'Datei konnte nicht gespeichert werden. Die Datei darf nicht größer als 10 MB sein.',
            'files.*.file' => 'Datei konnte nicht gespeichert werden. Die Datei ist ungültig.',
        ];
    }
}
