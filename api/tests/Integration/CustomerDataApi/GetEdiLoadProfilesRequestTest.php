<?php

declare(strict_types=1);

namespace Tests\Integration\CustomerDataApi;

use App\Integrations\CustomerDataApi\Data\EdiLoadProfileEntryData;
use App\Integrations\CustomerDataApi\Exceptions\ContractNotFoundException;
use App\Integrations\CustomerDataApi\Requests\GetEdiLoadProfilesRequest;
use Carbon\CarbonImmutable;
use Saloon\Enums\Method;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;
use Tests\Fixtures\FixtureLoader;

final class GetEdiLoadProfilesRequestTest extends CustomerDataApiTestCase
{
    public function test_it_fetches_the_edi_load_profiles_for_a_date_window(): void
    {
        $mockClient = new MockClient([
            GetEdiLoadProfilesRequest::class => new MockResponse(FixtureLoader::raw('customer-data-api/edi-load-profiles.json')),
        ]);

        $request = new GetEdiLoadProfilesRequest(
            contractNumber: 123456,
            from: CarbonImmutable::parse('2025-06-09'),
            until: CarbonImmutable::parse('2025-06-12'),
        );
        $response = $this->connector($mockClient)->send($request);
        $entries = $request->createDtoFromResponse($response);

        $this->assertRequestPath($mockClient, '/api/v1/contract/123456/edi-load-profiles');
        $this->assertSame(Method::GET, $this->lastPendingRequest($mockClient)->getMethod());
        $this->assertSame(
            ['from' => '2025-06-09', 'until' => '2025-06-12'],
            $this->lastPendingRequest($mockClient)->query()->all(),
        );
        $this->assertKvsTokenSent($mockClient);

        $this->assertCount(2, $entries);

        $first = $entries[0];
        $this->assertInstanceOf(EdiLoadProfileEntryData::class, $first);
        $this->assertSame(1, $first->id);
        $this->assertSame('2025-06-10 00:00:00', $first->readingStart->format('Y-m-d H:i:s'));
        $this->assertSame('2025-06-10 00:15:00', $first->readingEnd->format('Y-m-d H:i:s'));
        $this->assertSame(0.42, $first->amount);

        $this->assertSame(0.31, $entries[1]->amount);
    }

    public function test_a_404_response_throws_contract_not_found(): void
    {
        $mockClient = new MockClient([
            GetEdiLoadProfilesRequest::class => new MockResponse([], 404),
        ]);

        $this->expectException(ContractNotFoundException::class);
        $this->expectExceptionMessage('Vertrag 123456 wurde im System nicht gefunden. Fehlercode 404.');

        $this->connector($mockClient)->send(
            new GetEdiLoadProfilesRequest(123456, CarbonImmutable::parse('2025-06-09'), CarbonImmutable::parse('2025-06-12')),
        );
    }

    public function test_a_successful_response_without_data_throws_contract_not_found(): void
    {
        $mockClient = new MockClient([
            GetEdiLoadProfilesRequest::class => new MockResponse([]),
        ]);

        $request = new GetEdiLoadProfilesRequest(123456, CarbonImmutable::parse('2025-06-09'), CarbonImmutable::parse('2025-06-12'));
        $response = $this->connector($mockClient)->send($request);

        $this->expectException(ContractNotFoundException::class);
        $this->expectExceptionMessage('Vertrag 123456 wurde im System nicht gefunden. Rückgabe leer.');

        $request->createDtoFromResponse($response);
    }
}
