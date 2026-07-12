<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Requests\Admin\UpdateAdminProfileEmailRequest;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Models\User;
use App\Services\ProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin profile (old Company\ProfileController). Same behaviour as the
 * customer profile endpoints, but reachable without the `verified`
 * middleware: after an email change the old admin area stayed usable while
 * the new address was still unverified, so the admin variant must too.
 */
final readonly class ProfileController
{
    public function __construct(
        private ProfileService $profiles,
    ) {}

    public function show(Request $request): JsonResponse
    {
        return $this->profileResponse($this->admin($request));
    }

    public function updateEmail(UpdateAdminProfileEmailRequest $request): JsonResponse
    {
        $admin = $this->admin($request);

        $this->profiles->changeEmail($admin, $request->string('email')->value());

        return $this->profileResponse(
            $admin,
            'Ihre E-Mail-Adresse wurde aktualisiert. Bitte bestätigen Sie die neue E-Mail-Adresse. Hierzu haben wir Ihnen eine E-Mail an die neue Adresse geschickt.',
        );
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $admin = $this->admin($request);

        $this->profiles->changePassword($admin, $request->string('password')->value());

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
