<?php

declare(strict_types=1);

namespace Tests\Feature\Charts;

use App\Models\ContractToUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Saloon\Http\Faking\MockClient;
use Tests\Fixtures\FixtureLoader;
use Tests\TestCase;

abstract class ChartsTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Referer', 'http://localhost:3000');
    }

    protected function tearDown(): void
    {
        MockClient::destroyGlobal();

        parent::tearDown();
    }

    /**
     * Flip a tenant feature flag BEFORE the first request of the test — the
     * TenantConfig singleton is built from config at its first resolve.
     */
    protected function enableFeature(string $flag): void
    {
        config()->set('company.app.'.$flag, true);
    }

    /**
     * The canonical KVS contract payload (fixture contract 123456).
     *
     * @return array<array-key, mixed>
     */
    protected function contractPayload(): array
    {
        return FixtureLoader::data('customer-data-api/contract.json');
    }

    protected function customerWithContract(int $contractNumber = 123456, bool $confirmed = true): User
    {
        $user = User::factory()->create();

        $factory = ContractToUser::factory()->for($user);

        if (! $confirmed) {
            $factory = $factory->unconfirmed();
        }

        $factory->create(['contract_number' => $contractNumber]);

        return $user;
    }
}
