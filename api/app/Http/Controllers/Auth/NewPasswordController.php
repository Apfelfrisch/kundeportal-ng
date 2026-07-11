<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class NewPasswordController
{
    /**
     * Reset the password through Laravel's password broker.
     *
     * @throws ValidationException
     */
    public function store(ResetPasswordRequest $request): JsonResponse
    {
        $rawStatus = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            static function (User $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            },
        );

        $status = is_string($rawStatus) ? $rawStatus : Password::INVALID_TOKEN;

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [$this->translate($status)],
            ]);
        }

        return response()->json(['message' => $this->translate($status)]);
    }

    private function translate(string $status): string
    {
        $message = __($status);

        return is_string($message) ? $message : $status;
    }
}
