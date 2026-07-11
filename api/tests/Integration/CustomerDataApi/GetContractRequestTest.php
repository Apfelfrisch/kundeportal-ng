<?php

declare(strict_types=1);

namespace Tests\Integration\CustomerDataApi;

use App\Integrations\CustomerDataApi\Data\ContractData;
use App\Integrations\CustomerDataApi\Exceptions\ContractNotFoundException;
use App\Integrations\CustomerDataApi\Exceptions\CustomerDataApiAuthException;
use App\Integrations\CustomerDataApi\Exceptions\CustomerDataApiRequestFailedException;
use App\Integrations\CustomerDataApi\Requests\GetContractRequest;
use Saloon\Enums\Method;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;
use Tests\Fixtures\FixtureLoader;

final class GetContractRequestTest extends CustomerDataApiTestCase
{
    public function test_it_fetches_a_contract_and_hydrates_the_dto(): void
    {
        $mockClient = new MockClient([
            GetContractRequest::class => new MockResponse(FixtureLoader::raw('customer-data-api/contract.json')),
        ]);

        $request = new GetContractRequest(123456);
        $response = $this->connector($mockClient)->send($request);
        $contract = $request->createDtoFromResponse($response);

        $this->assertRequestPath($mockClient, '/api/v1/contract/123456');
        $this->assertSame(Method::GET, $this->lastPendingRequest($mockClient)->getMethod());
        $this->assertKvsTokenSent($mockClient);

        $this->assertInstanceOf(ContractData::class, $contract);
        $this->assertSame(123456, $contract->contractNumber);
        $this->assertSame('10001', $contract->customerNumber);
        $this->assertTrue($contract->sepa);
    }

    public function test_a_401_response_throws_the_auth_exception(): void
    {
        $mockClient = new MockClient([
            GetContractRequest::class => new MockResponse([], 401),
        ]);

        $this->expectException(CustomerDataApiAuthException::class);
        $this->expectExceptionMessage('Authentifizierung wurde abgelehnt. Fehlercode 401.');

        $this->connector($mockClient)->send(new GetContractRequest(123456));
    }

    public function test_a_404_response_throws_contract_not_found(): void
    {
        $mockClient = new MockClient([
            GetContractRequest::class => new MockResponse([], 404),
        ]);

        $this->expectException(ContractNotFoundException::class);
        $this->expectExceptionMessage('Vertrag 123456 wurde im System nicht gefunden. Fehlercode 404.');

        $this->connector($mockClient)->send(new GetContractRequest(123456));
    }

    public function test_a_successful_response_without_data_throws_contract_not_found(): void
    {
        $mockClient = new MockClient([
            GetContractRequest::class => new MockResponse(['data' => null]),
        ]);

        $request = new GetContractRequest(123456);
        $response = $this->connector($mockClient)->send($request);

        $this->expectException(ContractNotFoundException::class);
        $this->expectExceptionMessage('Vertrag 123456 wurde im System nicht gefunden. Rückgabe leer.');

        $request->createDtoFromResponse($response);
    }

    public function test_other_error_statuses_throw_the_generic_exception(): void
    {
        $mockClient = new MockClient([
            GetContractRequest::class => new MockResponse([], 500),
        ]);

        $this->expectException(CustomerDataApiRequestFailedException::class);
        $this->expectExceptionMessage('Anfrage an die Kundendaten-API ist fehlgeschlagen. Fehlercode 500.');

        $this->connector($mockClient)->send(new GetContractRequest(123456));
    }
}
