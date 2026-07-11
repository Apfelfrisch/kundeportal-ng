<?php

declare(strict_types=1);

namespace Tests\Feature\Customer;

use App\Models\ContractToUser;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Saloon\Http\Faking\MockClient;
use Tests\Fixtures\FixtureLoader;
use Tests\TestCase;

abstract class CustomerTestCase extends TestCase
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
     * The canonical KVS contract payload (fixture contract 123456).
     *
     * @param  array<string, mixed>  $overrides
     * @return array<array-key, mixed>
     */
    protected function contractPayload(array $overrides = []): array
    {
        return array_replace(FixtureLoader::data('customer-data-api/contract.json'), $overrides);
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
