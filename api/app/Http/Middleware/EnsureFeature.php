<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\TenantConfig;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Hides feature-flagged routes (404) when the tenant has the feature
 * disabled, so a single route file serves every tenant.
 */
final class EnsureFeature
{
    public function __construct(private readonly TenantConfig $tenant) {}

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next, string $flag): Response
    {
        if (! $this->tenant->hasFeature($flag)) {
            abort(404);
        }

        return $next($request);
    }
}
