<?php

declare(strict_types=1);

namespace Tests\Integration\CustomerDataApi;

use App\Integrations\CustomerDataApi\Exceptions\ContractNotFoundException;
use App\Integrations\CustomerDataApi\Requests\GetLastBillingDateRequest;
use Saloon\Enums\Method;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;

final class GetLastBillingDateRequestTest extends CustomerDataApiTestCase
{
    public function test_it_fetches_the_last_billing_date(): void
    {
        $mockClient = new MockClient([
            GetLastBillingDateRequest::class => new MockResponse(['last_billing_date' => '2025-06-01']),
        ]);

        $request = new GetLastBillingDateRequest(123456);
        $response = $this->connector($mockClient)->send($request);
        $date = $request->createDtoFromResponse($response);

        $this->assertRequestPath($mockClient, '/api/v1/contract/123456/billed-load-profiles/last-billing-date');
        $this->assertSame(Method::GET, $this->lastPendingRequest($mockClient)->getMethod());
        $this->assertKvsTokenSent($mockClient);

        $this->assertSame('2025-06-01', $date?->format('Y-m-d'));
    }

    public function test_a_missing_or_empty_date_yields_null(): void
    {
        $mockClient = new MockClient([
            new MockResponse(['last_billing_date' => null]),
            new MockResponse([]),
            new MockResponse(['last_billing_date' => '']),
        ]);

        $connector = $this->connector($mockClient);

        foreach (range(1, 3) as $ignored) {
            $request = new GetLastBillingDateRequest(123456);
            $response = $connector->send($request);

            $this->assertNull($request->createDtoFromResponse($response));
        }
    }

    public function test_a_404_response_throws_contract_not_found(): void
    {
        $mockClient = new MockClient([
            GetLastBillingDateRequest::class => new MockResponse([], 404),
        ]);

        $this->expectException(ContractNotFoundException::class);
        $this->expectExceptionMessage('Vertrag 123456 wurde im System nicht gefunden. Fehlercode 404.');

        $this->connector($mockClient)->send(new GetLastBillingDateRequest(123456));
    }
}
