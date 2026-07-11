<?php

declare(strict_types=1);

namespace Tests\Feature\Mailbox;

use App\Models\CompanyMessage;
use App\Models\CompanyUploadedFile;
use App\Models\CustomerMessage;
use App\Models\CustomerUploadedFile;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

final class MailboxFileStreamTest extends MailboxTestCase
{
    private const string PDF_CONTENT = '%PDF-1.4 mailbox file content';

    public function test_a_customer_uploaded_file_is_streamed_inline(): void
    {
        Storage::fake('local');

        $user = $this->customer();
        $path = "customer-uploads/{$user->id}/antwort.pdf";
        Storage::disk('local')->put($path, self::PDF_CONTENT);

        $file = CustomerUploadedFile::factory()
            ->for(CustomerMessage::factory()->for($user, 'user'), 'message')
            ->create([
                'customer_user_id' => $user->id,
                'name' => 'antwort.pdf',
                'path' => $path,
                'mime_type' => 'application/pdf',
            ]);

        $response = $this->actingAs($user)
            ->get("/api/customers/{$user->id}/postfach/files/customer/{$file->id}")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf')
            ->assertHeader('Content-Disposition', 'inline; filename="antwort.pdf"');

        $this->assertSame(self::PDF_CONTENT, $response->streamedContent());
    }

    public function test_a_company_uploaded_file_is_streamed_inline(): void
    {
        Storage::fake('local');

        $user = $this->customer();
        $path = 'company-uploads/unterlagen.pdf';
        Storage::disk('local')->put($path, self::PDF_CONTENT);

        $file = CompanyUploadedFile::factory()
            ->for(CompanyMessage::factory()->for($user, 'user'), 'message')
            ->create([
                'customer_user_id' => $user->id,
                'name' => 'unterlagen.pdf',
                'path' => $path,
                'mime_type' => 'application/pdf',
            ]);

        $response = $this->actingAs($user)
            ->get("/api/customers/{$user->id}/postfach/files/company/{$file->id}")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf')
            ->assertHeader('Content-Disposition', 'inline; filename="unterlagen.pdf"');

        $this->assertSame(self::PDF_CONTENT, $response->streamedContent());
    }

    public function test_a_file_of_another_customer_is_forbidden(): void
    {
        Storage::fake('local');

        $user = $this->customer();
        $otherCustomer = User::factory()->create();

        $foreignFile = CustomerUploadedFile::factory()->create([
            'customer_user_id' => $otherCustomer->id,
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/postfach/files/customer/{$foreignFile->id}")
            ->assertForbidden()
            ->assertJsonPath('message', 'Sie haben keinen Zugriff auf diese Datei.');
    }

    public function test_an_unknown_file_returns_a_german_404(): void
    {
        Storage::fake('local');

        $user = $this->customer();

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/postfach/files/customer/999")
            ->assertNotFound()
            ->assertJsonPath('message', 'Die Datei wurde nicht gefunden.');

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/postfach/files/company/999")
            ->assertNotFound()
            ->assertJsonPath('message', 'Die Datei wurde nicht gefunden.');
    }

    public function test_a_missing_blob_on_the_disk_returns_a_german_404(): void
    {
        Storage::fake('local');

        $user = $this->customer();

        $file = CustomerUploadedFile::factory()->create([
            'customer_user_id' => $user->id,
            'path' => 'customer-uploads/missing.pdf',
        ]);

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/postfach/files/customer/{$file->id}")
            ->assertNotFound()
            ->assertJsonPath('message', 'Die Datei wurde nicht gefunden.');
    }

    public function test_a_guest_gets_401(): void
    {
        $user = $this->customer();

        $this->getJson("/api/customers/{$user->id}/postfach/files/customer/1")
            ->assertUnauthorized();
    }
}
