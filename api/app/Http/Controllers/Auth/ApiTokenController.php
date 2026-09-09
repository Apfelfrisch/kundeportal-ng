<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Requests\Auth\TokenRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

/**
 * Bearer-token login for the mobile app. The SPA keeps its cookie session;
 * native clients cannot take part in the CSRF/cookie dance, so they trade
 * their credentials for a Sanctum personal access token instead. The token
 * is accepted by every `auth:sanctum` route.
 */
final class ApiTokenController
{
    public function store(TokenRequest $request): JsonResponse
    {
        $request->authenticate();

        $user = Auth::guard('web')->user();

        abort_unless($user instanceof User, 401);

        // Auth::attempt() logged the user into the (stateless) web guard;
        // the token is the only credential the app should keep.
        Auth::guard('web')->logout();

        $token = $user->createToken($request->string('device_name')->value());

        return response()->json([
            ...AuthUserPayload::make($user),
            'token' => $token->plainTextToken,
        ], 201);
    }

    /**
     * Revokes the token the request was authenticated with.
     */
    public function destroy(Request $request): Response
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        // A cookie session carries only a transient token — there is nothing
        // to revoke, and the SPA has its own logout.
        abort_if($request->bearerToken() === null, 400, 'Nur mit Bearer-Token möglich.');

        $user->currentAccessToken()->delete();

        return response()->noContent();
    }
}
