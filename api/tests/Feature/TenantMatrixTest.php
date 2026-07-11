<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Support\TenantConfig;
use Tests\TestCase;

/**
 * The suite runs pinned to CLIENT=voltaik-check (phpunit.xml). This test
 * loads the other tenant's config file directly so a broken
 * config/clients/friesen-werk.php fails CI instead of production boot.
 */
final class TenantMatrixTest extends TestCase
{
    public function test_friesen_werk_config_file_is_valid_and_feature_complete(): void
    {
        /** @var array<string, mixed> $config */
        $config = require config_path('clients/friesen-werk.php');

        config()->set($config);
        $this->app->forgetInstance(TenantConfig::class);

        $response = $this->getJson('/api/tenant');

        $response->assertOk()
            ->assertJsonPath('data.slug', 'friesen-werk')
            ->assertJsonPath('data.name.short', 'FriesenWerk')
            ->assertJsonPath('data.features.dynamic_electric_prices', true)
            ->assertJsonPath('data.features.edi_load_profiles', true)
            ->assertJsonPath('data.contact.email', 'moin@friesen-werk.de');

        $tenant = $this->app->make(TenantConfig::class);
        self::assertSame('fw', $tenant->salesPartner(1));
        self::assertSame('cclp', $tenant->salesPartner('2'));
        self::assertNull($tenant->salesPartner(99));
    }
}
