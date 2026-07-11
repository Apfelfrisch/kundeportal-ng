<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Users created by staff start without a password. Until they set one they
 * may not use the portal; the SPA redirects to its set-password page when it
 * receives this error code.
 */
final class EnsurePasswordSet
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof User && ! $user->hasPassword()) {
            return response()->json([
                'message' => 'Bitte legen Sie zuerst ein Passwort fest.',
                'code' => 'password_not_set',
            ], 409);
        }

        return $next($request);
    }
}
