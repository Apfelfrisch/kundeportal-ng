<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi;

use App\Integrations\CustomerDataApi\Exceptions\CustomerDataApiRequestFailedException;
use Closure;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Saloon\Exceptions\Request\FatalRequestException;

/**
 * Last-known-good fallback for reads from the customer-data-api. Every
 * successful fetch refreshes the cached copy, and the cache is only read
 * when the upstream is unavailable — a connection failure or an error
 * response other than 401/404 — so a healthy API never serves stale data.
 * Deliberate upstream answers (contract not found, rejected token) pass
 * through untouched.
 */
final class StaleOnErrorCache
{
    /**
     * How long a last-known-good copy stays usable; bounds the staleness a
     * customer can be served during an outage.
     */
    private const int RETENTION_DAYS = 7;

    private const string KEY_PREFIX = 'customer-data-api:stale:';

    /**
     * @template TValue
     *
     * @param  Closure(): TValue  $fetch
     * @return TValue
     */
    public function remember(string $key, Closure $fetch): mixed
    {
        $cacheKey = self::KEY_PREFIX.$key;

        try {
            $value = $fetch();
        } catch (FatalRequestException|CustomerDataApiRequestFailedException $exception) {
            $stale = Cache::get($cacheKey);

            if ($stale === null) {
                throw $exception;
            }

            Log::warning('customer-data-api unavailable, serving last known good data', [
                'cache_key' => $cacheKey,
                'error' => $exception->getMessage(),
            ]);

            return $stale;
        }

        Cache::put($cacheKey, $value, now()->addDays(self::RETENTION_DAYS));

        return $value;
    }
}
