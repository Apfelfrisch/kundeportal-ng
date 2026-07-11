<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Integrations\CustomerDataApi\Data\ContractData;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Saloon\Http\Faking\MockClient;
use Tests\Fixtures\FixtureLoader;
use Tests\TestCase;

abstract class AdminTestCase extends TestCase
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

    protected function admin(): User
    {
        return User::factory()->admin()->create();
    }

    /**
     * The canonical KVS contract payload (fixture contract 123456,
     * mail_address alt@example.org).
     *
     * @param  array<string, mixed>  $overrides
     * @return array<array-key, mixed>
     */
    protected function contractPayload(array $overrides = []): array
    {
        return array_replace(FixtureLoader::data('customer-data-api/contract.json'), $overrides);
    }

    /**
     * A GET /contracts paginator body as ContractPageData expects it.
     *
     * @param  list<array<array-key, mixed>>  $contracts
     * @return array<string, mixed>
     */
    protected function contractsPagePayload(array $contracts, int $currentPage = 1, int $lastPage = 1, ?int $total = null): array
    {
        return [
            'data' => $contracts,
            'meta' => [
                'current_page' => $currentPage,
                'last_page' => $lastPage,
                'total' => $total ?? count($contracts),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    protected function contract(array $overrides = []): ContractData
    {
        return ContractData::fromArray($this->contractPayload($overrides));
    }
}
