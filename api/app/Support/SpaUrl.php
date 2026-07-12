<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Absolute SPA (frontend) URL for a given path — the single home of the
 * `app.frontend_url` base join.
 */
final readonly class SpaUrl
{
    public static function to(string $path): string
    {
        return rtrim(config()->string('app.frontend_url'), '/').$path;
    }
}
