<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Signed URLs are generated against API routes so their signatures stay
 * valid when the SPA calls the API back. For the mail link itself we swap
 * scheme, host and path to the frontend route while keeping the entire
 * query string (expires + signature + any extra parameters).
 */
final readonly class SignedSpaUrl
{
    public static function toFrontend(string $signedApiUrl, string $frontendPath): string
    {
        $frontendBase = SpaUrl::to($frontendPath);

        $query = parse_url($signedApiUrl, PHP_URL_QUERY);

        if (! is_string($query) || $query === '') {
            return $frontendBase;
        }

        return $frontendBase.'?'.$query;
    }
}
