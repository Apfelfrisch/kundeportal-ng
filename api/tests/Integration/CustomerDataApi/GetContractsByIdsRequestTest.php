<?php

declare(strict_types=1);

namespace Tests\Integration\CustomerDataApi;

use App\Integrations\CustomerDataApi\Data\ContractData;
use App\Integrations\CustomerDataApi\Exceptions\ContractNotFoundException;
use App\Integrations\CustomerDataApi\Requests\GetContractsByIdsRequest;
use Saloon\Enums\Method;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;
use Saloon\Repositories\Body\JsonBodyRepository;
use Tests\Fixtures\FixtureLoader;

final class GetContractsByIdsRequestTest extends CustomerDataApiTestCase
{
    public function test_it_posts_the_contract_numbers_and_hydrates_the_dto_list(): void
    {
        $mockClient = new MockClient([
            GetContractsByIdsRequest::class => new MockResponse([
                'data' => [FixtureLoader::data('customer-data-api/contract.json')],
            ]),
        ]);

        $request = new GetContractsByIdsRequest([123456, 654321]);
        $response = $this->connector($mockClient)->send($request);
        $contracts = $request->createDtoFromResponse($response);

        $this->assertRequestPath($mockClient, '/api/v1/contracts/by-ids');
        $this->assertSame(Method::POST, $this->lastPendingRequest($mockClient)->getMethod());
        $this->assertKvsTokenSent($mockClient);

        $body = $this->lastPendingRequest($mockClient)->body();
        $this->assertInstanceOf(JsonBodyRepository::class, $body);
        $this->assertSame(['ids' => [123456, 654321]], $body->all());

        $this->assertCount(1, $contracts);
        $this->assertInstanceOf(ContractData::class, $contracts[0]);
        $this->assertSame(123456, $contracts[0]->contractNumber);
    }

    public function test_an_empty_data_list_yields_an_empty_dto_list(): void
    {
        $mockClient = new MockClient([
            GetContractsByIdsRequest::class => new MockResponse(['data' => []]),
        ]);

        $request = new GetContractsByIdsRequest([999999]);
        $response = $this->connector($mockClient)->send($request);

        $this->assertSame([], $request->createDtoFromResponse($response));
    }

    public function test_a_successful_response_without_data_throws_not_found(): void
    {
        $mockClient = new MockClient([
            GetContractsByIdsRequest::class => new MockResponse(['data' => null]),
        ]);

        $request = new GetContractsByIdsRequest([123456]);
        $response = $this->connector($mockClient)->send($request);

        $this->expectException(ContractNotFoundException::class);
        $this->expectExceptionMessage('Keine Verträge gefunden. Rückgabe leer.');

        $request->createDtoFromResponse($response);
    }
}
