<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Contracts\Config\Repository;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

/**
 * Merges the tenant configuration (config/clients/{slug}.php, selected via the
 * CLIENT env var) into the global config so `company.*` and `partner.*` keys
 * are available application-wide.
 */
final class ClientConfigServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $repository = $this->app->make(Repository::class);

        $tenant = $repository->get('app.client');

        if (! is_string($tenant) || $tenant === '') {
            return;
        }

        $path = config_path("clients/{$tenant}.php");

        if (! file_exists($path)) {
            throw new RuntimeException("Unknown tenant [{$tenant}]: missing config file {$path}.");
        }

        /** @var array<string, mixed> $config */
        $config = require $path;

        $repository->set($config);
    }
}
