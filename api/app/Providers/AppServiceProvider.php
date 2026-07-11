<?php

declare(strict_types=1);

namespace App\Providers;

use App\Support\TenantConfig;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(TenantConfig::class, static fn (): TenantConfig => TenantConfig::fromConfig());
    }

    public function boot(): void
    {
        Model::shouldBeStrict();
        Date::use(CarbonImmutable::class);
        DB::prohibitDestructiveCommands($this->app->isProduction());

        Password::defaults(function (): Password {
            $minLength = config()->integer('auth.passwords.min-length');

            return Password::min($minLength)->letters()->numbers();
        });
    }
}
