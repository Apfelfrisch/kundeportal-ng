<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

final class TenantEndpointTest extends TestCase
{
    public function test_it_exposes_the_tenant_branding(): void
    {
        $response = $this->getJson('/api/tenant');

        $response->assertOk()
            ->assertJsonPath('data.slug', 'voltaik-check')
            ->assertJsonPath('data.name.short', 'Voltaik Strom')
            ->assertJsonPath('data.features.dynamic_electric_prices', false)
            ->assertJsonPath('data.features.edi_load_profiles', false)
            ->assertJsonPath('data.contact.email', 'info@voltaik-strom.de')
            ->assertJsonStructure([
                'data' => ['slug', 'name', 'website', 'contact', 'legal', 'bank', 'features'],
            ]);
    }

    public function test_it_never_exposes_kvs_internals(): void
    {
        $json = $this->getJson('/api/tenant')->json();

        self::assertIsArray($json);
        self::assertStringNotContainsString('kvs', strtolower(json_encode($json, JSON_THROW_ON_ERROR)));
    }
}
