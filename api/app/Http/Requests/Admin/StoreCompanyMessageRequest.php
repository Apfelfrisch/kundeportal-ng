<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Support\MailboxFileRules;
use Illuminate\Foundation\Http\FormRequest;

final class StoreCompanyMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * File rules mirror the customer mailbox upload rules.
     *
     * @return array<string, list<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'customer_user_id' => ['required', 'integer', 'exists:users,id'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string'],
            ...MailboxFileRules::rules(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return MailboxFileRules::messages();
    }
}
