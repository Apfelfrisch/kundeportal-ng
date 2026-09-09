<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Http\Requests\Auth\Concerns\AuthenticatesCredentials;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Token login of the mobile app: the SPA login rules plus a device name
 * the issued token is labelled with.
 */
final class TokenRequest extends FormRequest
{
    use AuthenticatesCredentials;

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
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['required', 'string', 'max:255'],
        ];
    }
}
