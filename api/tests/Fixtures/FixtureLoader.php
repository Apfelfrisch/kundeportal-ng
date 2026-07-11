<?php

declare(strict_types=1);

namespace Tests\Fixtures;

use RuntimeException;

final class FixtureLoader
{
    public static function raw(string $relativePath): string
    {
        $path = __DIR__.'/'.$relativePath;
        $contents = file_get_contents($path);

        if ($contents === false) {
            throw new RuntimeException("Fixture {$path} could not be read.");
        }

        return $contents;
    }

    /**
     * @return array<array-key, mixed>
     */
    public static function json(string $relativePath): array
    {
        $decoded = json_decode(self::raw($relativePath), true, 512, JSON_THROW_ON_ERROR);

        if (! is_array($decoded)) {
            throw new RuntimeException("Fixture {$relativePath} does not contain a JSON object.");
        }

        return $decoded;
    }

    /**
     * The `data` object of a fixture (the KVS payload convention).
     *
     * @return array<array-key, mixed>
     */
    public static function data(string $relativePath): array
    {
        $decoded = self::json($relativePath);

        if (! is_array($decoded['data'] ?? null)) {
            throw new RuntimeException("Fixture {$relativePath} has no 'data' object.");
        }

        return $decoded['data'];
    }
}
