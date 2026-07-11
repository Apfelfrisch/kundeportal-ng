<?php

declare(strict_types=1);

namespace Tests\Integration\CustomerDataApi;

use App\Integrations\CustomerDataApi\Data\ContractData;
use App\Integrations\CustomerDataApi\Data\ContractPageData;
use App\Integrations\CustomerDataApi\Exceptions\ContractNotFoundException;
use App\Integrations\CustomerDataApi\Exceptions\CustomerDataApiAuthException;
use App\Integrations\CustomerDataApi\Requests\GetContractsRequest;
use Saloon\Enums\Method;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;
use Tests\Fixtures\FixtureLoader;

final class GetContractsRequestTest extends CustomerDataApiTestCase
{
    public function test_it_fetches_a_contract_page_and_hydrates_the_dto(): void
    {
        $mockClient = new MockClient([
            GetContractsRequest::class => new MockResponse([
                'data' => [FixtureLoader::data('customer-data-api/contract.json')],
                'links' => ['prev' => null, 'next' => null],
                'meta' => ['current_page' => 2, 'last_page' => 5, 'total' => 55],
            ]),
        ]);

        $request = new GetContractsRequest(page: 2);
        $response = $this->connector($mockClient)->send($request);
        $page = $request->createDtoFromResponse($response);

        $this->assertRequestPath($mockClient, '/api/v1/contracts');
        $this->assertSame(Method::GET, $this->lastPendingRequest($mockClient)->getMethod());
        $this->assertSame(['page' => 2], $this->lastPendingRequest($mockClient)->query()->all());
        $this->assertKvsTokenSent($mockClient);

        $this->assertInstanceOf(ContractPageData::class, $page);
        $this->assertSame(2, $page->currentPage);
        $this->assertSame(5, $page->lastPage);
        $this->assertSame(55, $page->total);
        $this->assertCount(1, $page->items);
        $this->assertInstanceOf(ContractData::class, $page->items[0]);
        $this->assertSame(123456, $page->items[0]->contractNumber);
    }

    public function test_the_page_defaults_to_one(): void
    {
        $mockClient = new MockClient([
            GetContractsRequest::class => new MockResponse([
                'data' => [],
                'meta' => ['current_page' => 1, 'last_page' => 1, 'total' => 0],
            ]),
        ]);

        $this->connector($mockClient)->send(new GetContractsRequest);

        $this->assertSame(['page' => 1], $this->lastPendingRequest($mockClient)->query()->all());
    }

    public function test_a_401_response_throws_the_auth_exception(): void
    {
        $mockClient = new MockClient([
            GetContractsRequest::class => new MockResponse([], 401),
        ]);

        $this->expectException(CustomerDataApiAuthException::class);

        $this->connector($mockClient)->send(new GetContractsRequest);
    }

    public function test_a_404_response_throws_not_found_with_the_admin_repository_message(): void
    {
        $mockClient = new MockClient([
            GetContractsRequest::class => new MockResponse([], 404),
        ]);

        $this->expectException(ContractNotFoundException::class);
        $this->expectExceptionMessage('Keine Verträge gefunden. Fehlercode 404.');

        $this->connector($mockClient)->send(new GetContractsRequest);
    }

    public function test_a_successful_response_without_data_throws_not_found(): void
    {
        $mockClient = new MockClient([
            GetContractsRequest::class => new MockResponse(['foo' => 'bar']),
        ]);

        $request = new GetContractsRequest;
        $response = $this->connector($mockClient)->send($request);

        $this->expectException(ContractNotFoundException::class);
        $this->expectExceptionMessage('Keine Verträge gefunden. Rückgabe leer.');

        $request->createDtoFromResponse($response);
    }
}
