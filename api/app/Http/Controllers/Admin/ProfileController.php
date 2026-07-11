<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Requests\Admin\UpdateAdminProfileEmailRequest;
use App\Http\Requests\Customer\UpdateProfilePasswordRequest;
use App\Models\User;
use App\Notifications\EmailChangedNotification;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

/**
 * Admin profile (old Company\ProfileController). Same behaviour as the
 * customer profile endpoints, but reachable without the `verified`
 * middleware: after an email change the old admin area stayed usable while
 * the new address was still unverified, so the admin variant must too.
 */
final class ProfileController
{
    public function show(Request $request): JsonResponse
    {
        return $this->profileResponse($this->admin($request));
    }

    public function updateEmail(UpdateAdminProfileEmailRequest $request): JsonResponse
    {
        $admin = $this->admin($request);

        $oldEmail = $admin->email;

        $admin->email = $request->string('email')->value();
        $admin->email_verified_at = null;
        $admin->save();

        Notification::route('mail', $oldEmail)
            ->notify(new EmailChangedNotification($admin->email));

        $admin->sendEmailVerificationNotification();

        return $this->profileResponse(
            $admin,
            'Ihre E-Mail-Adresse wurde aktualisiert. Bitte bestätigen Sie die neue E-Mail-Adresse. Hierzu haben wir Ihnen eine E-Mail an die neue Adresse geschickt.',
        );
    }

    public function updatePassword(UpdateProfilePasswordRequest $request): JsonResponse
    {
        $admin = $this->admin($request);

        $admin->password = Hash::make($request->string('password')->value());
        $admin->save();

        // The SendPasswordChangedMail listener informs the admin, exactly
        // like the customer profile endpoint.
        event(new PasswordReset($admin));

        return $this->profileResponse($admin, 'Ihr Passwort wurde aktualisiert.');
    }

    private function admin(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return $user;
    }

    private function profileResponse(User $user, ?string $message = null): JsonResponse
    {
        $payload = [
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified' => $user->hasVerifiedEmail(),
                'password_set' => $user->hasPassword(),
            ],
        ];

        if ($message !== null) {
            $payload['message'] = $message;
        }

        return response()->json($payload);
    }
}
