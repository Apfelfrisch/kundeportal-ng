<?php

declare(strict_types=1);

namespace Tests\Feature\Customer;

use App\Integrations\CustomerDataApi\Requests\GetContractRequest;
use Illuminate\Support\Facades\Storage;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;

final class ContractFileStreamTest extends CustomerTestCase
{
    private const string PDF_PATH = 'contracts/123456/vertragsbestaetigung.pdf';

    private const string PDF_CONTENT = '%PDF-1.4 fake-pdf-content';

    public function test_a_contract_file_is_streamed_inline(): void
    {
        Storage::fake('customer-api');
        Storage::disk('customer-api')->put(self::PDF_PATH, self::PDF_CONTENT);

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
        ]);

        $response = $this->actingAs($user)
            ->get("/api/customers/{$user->id}/contracts/123456/files/601")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf')
            ->assertHeader('Content-Disposition', 'inline; filename="vertragsbestaetigung.pdf"');

        $this->assertSame(self::PDF_CONTENT, $response->streamedContent());
    }

    public function test_download_flag_switches_to_attachment_disposition(): void
    {
        Storage::fake('customer-api');
        Storage::disk('customer-api')->put(self::PDF_PATH, self::PDF_CONTENT);

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
        ]);

        $this->actingAs($user)
            ->get("/api/customers/{$user->id}/contracts/123456/files/601?download=1")
            ->assertOk()
            ->assertHeader('Content-Disposition', 'attachment; filename="vertragsbestaetigung.pdf"');
    }

    public function test_an_unknown_file_id_returns_a_german_404(): void
    {
        Storage::fake('customer-api');

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/files/999")
            ->assertNotFound()
            ->assertJsonPath('message', 'Das Dokument wurde nicht gefunden.');
    }

    public function test_a_missing_blob_on_the_disk_returns_a_german_404(): void
    {
        Storage::fake('customer-api');

        $user = $this->customerWithContract();

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $this->contractPayload()]),
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/files/601")
            ->assertNotFound()
            ->assertJsonPath('message', 'Das Dokument wurde nicht gefunden.');
    }

    public function test_a_foreign_user_cannot_stream_files(): void
    {
        Storage::fake('customer-api');

        $user = $this->customerWithContract(confirmed: false);

        MockClient::global([]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/contracts/123456/files/601")
            ->assertForbidden();
    }
}
