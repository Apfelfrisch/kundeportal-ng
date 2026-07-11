<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\CustomerMessageStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateTicketStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', 'string', Rule::in(['open', 'in_process', 'processed'])],
        ];
    }

    public function status(): CustomerMessageStatus
    {
        return match ($this->string('status')->value()) {
            'open' => CustomerMessageStatus::UnProcessed,
            'in_process' => CustomerMessageStatus::InProcess,
            default => CustomerMessageStatus::Processed,
        };
    }
}
