<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

final class AuthenticatedSessionController
{
    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): JsonResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return response()->json(AuthUserPayload::make($user));
    }

    /**
     * The SPA session probe: 200 with the user when authenticated, 401 otherwise.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');

        if (! $user instanceof User) {
            return response()->json(['message' => 'Nicht angemeldet.'], 401);
        }

        return response()->json(AuthUserPayload::make($user));
    }

    /**
     * Destroy the authenticated session.
     */
    public function destroy(Request $request): Response
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return response()->noContent();
    }
}
