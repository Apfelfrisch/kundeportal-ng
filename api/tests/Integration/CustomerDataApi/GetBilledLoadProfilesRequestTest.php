<?php

declare(strict_types=1);

namespace Tests\Integration\CustomerDataApi;

use App\Integrations\CustomerDataApi\Data\BilledLoadProfileEntryData;
use App\Integrations\CustomerDataApi\Exceptions\ContractNotFoundException;
use App\Integrations\CustomerDataApi\Requests\GetBilledLoadProfilesRequest;
use Carbon\CarbonImmutable;
use Saloon\Enums\Method;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;
use Tests\Fixtures\FixtureLoader;

final class GetBilledLoadProfilesRequestTest extends CustomerDataApiTestCase
{
    public function test_it_fetches_the_billed_load_profiles_for_a_date_window(): void
    {
        $mockClient = new MockClient([
            GetBilledLoadProfilesRequest::class => new MockResponse(FixtureLoader::raw('customer-data-api/billed-load-profiles.json')),
        ]);

        $request = new GetBilledLoadProfilesRequest(
            contractNumber: 123456,
            from: CarbonImmutable::parse('2025-06-09'),
            until: CarbonImmutable::parse('2025-06-12'),
        );
        $response = $this->connector($mockClient)->send($request);
        $entries = $request->createDtoFromResponse($response);

        $this->assertRequestPath($mockClient, '/api/v1/contract/123456/billed-load-profiles');
        $this->assertSame(Method::GET, $this->lastPendingRequest($mockClient)->getMethod());
        $this->assertSame(
            ['from' => '2025-06-09', 'until' => '2025-06-12'],
            $this->lastPendingRequest($mockClient)->query()->all(),
        );
        $this->assertKvsTokenSent($mockClient);

        $this->assertCount(2, $entries);

        $first = $entries[0];
        $this->assertInstanceOf(BilledLoadProfileEntryData::class, $first);
        $this->assertSame(1, $first->id);
        $this->assertSame('2025-06-10 00:00:00', $first->from->format('Y-m-d H:i:s'));
        $this->assertSame('2025-06-10 00:15:00', $first->until->format('Y-m-d H:i:s'));
        $this->assertSame(0.35, $first->usageKwh);
        $this->assertSame(1, $first->usageType);
        $this->assertNull($first->priceTag);
        $this->assertSame('Dynamik Strom', $first->tariffName);
        $this->assertSame(8213.0, $first->centMwh);
        $this->assertCount(5, $first->priceComponents);
        $this->assertSame('supplierWorkingPrice', $first->priceComponents[0]->name);
        $this->assertSame(0.02, $first->priceComponents[0]->amount);
        $this->assertSame('working_price', $first->priceComponents[0]->type);
    }

    public function test_entries_without_price_components_default_to_an_empty_list(): void
    {
        $mockClient = new MockClient([
            GetBilledLoadProfilesRequest::class => new MockResponse(FixtureLoader::raw('customer-data-api/billed-load-profiles.json')),
        ]);

        $request = new GetBilledLoadProfilesRequest(123456, CarbonImmutable::parse('2025-06-09'), CarbonImmutable::parse('2025-06-12'));
        $response = $this->connector($mockClient)->send($request);
        $entries = $request->createDtoFromResponse($response);

        $this->assertSame([], $entries[1]->priceComponents);
    }

    public function test_a_404_response_throws_contract_not_found(): void
    {
        $mockClient = new MockClient([
            GetBilledLoadProfilesRequest::class => new MockResponse([], 404),
        ]);

        $this->expectException(ContractNotFoundException::class);
        $this->expectExceptionMessage('Vertrag 123456 wurde im System nicht gefunden. Fehlercode 404.');

        $this->connector($mockClient)->send(
            new GetBilledLoadProfilesRequest(123456, CarbonImmutable::parse('2025-06-09'), CarbonImmutable::parse('2025-06-12')),
        );
    }

    public function test_a_successful_response_without_data_throws_contract_not_found(): void
    {
        $mockClient = new MockClient([
            GetBilledLoadProfilesRequest::class => new MockResponse([]),
        ]);

        $request = new GetBilledLoadProfilesRequest(123456, CarbonImmutable::parse('2025-06-09'), CarbonImmutable::parse('2025-06-12'));
        $response = $this->connector($mockClient)->send($request);

        $this->expectException(ContractNotFoundException::class);
        $this->expectExceptionMessage('Vertrag 123456 wurde im System nicht gefunden. Rückgabe leer.');

        $request->createDtoFromResponse($response);
    }
}
