<?php

declare(strict_types=1);

namespace Tests\Feature\Mailbox;

use App\Models\CompanyMessage;
use App\Models\CompanyUploadedFile;
use App\Models\CustomerMessage;
use App\Models\CustomerUploadedFile;
use App\Models\User;

final class MailboxThreadTest extends MailboxTestCase
{
    public function test_the_thread_merges_both_message_types_newest_first(): void
    {
        $user = $this->customer();

        // Oldest: a change-request ticket (no `message` key → '-', old getData()).
        CustomerMessage::factory()->for($user, 'user')->create([
            'form_type' => 'bank',
            'data' => ['iban' => 'DE02120300000000202051'],
            'created_at' => now()->subMinutes(3),
        ]);

        $companyMessage = CompanyMessage::factory()->for($user, 'user')->create([
            'subject' => 'Wichtige Info',
            'message' => 'Bitte senden Sie uns noch Unterlagen.',
            'created_at' => now()->subMinutes(2),
        ]);

        CompanyUploadedFile::factory()->for($companyMessage, 'message')->create([
            'customer_user_id' => $user->id,
            'name' => 'unterlagen.pdf',
            'mime_type' => 'application/pdf',
        ]);

        $chatMessage = CustomerMessage::factory()->for($user, 'user')->create([
            'form_type' => 'contact',
            'data' => ['message' => 'Hier sind die angefragten Informationen.'],
            'created_at' => now()->subMinute(),
        ]);

        CustomerUploadedFile::factory()->for($chatMessage, 'message')->create([
            'customer_user_id' => $user->id,
            'name' => 'antwort.png',
            'mime_type' => 'image/png',
        ]);

        // A foreign customer's message must not leak into the thread.
        CustomerMessage::factory()->create();

        $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/postfach")
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.direction', 'customer')
            ->assertJsonPath('data.0.form_type', 'contact')
            ->assertJsonPath('data.0.message', 'Hier sind die angefragten Informationen.')
            ->assertJsonPath('data.0.files.0.name', 'antwort.png')
            ->assertJsonPath('data.0.files.0.mime_type', 'image/png')
            ->assertJsonPath('data.1.direction', 'company')
            ->assertJsonPath('data.1.subject', 'Wichtige Info')
            ->assertJsonPath('data.1.message', 'Bitte senden Sie uns noch Unterlagen.')
            ->assertJsonPath('data.1.files.0.name', 'unterlagen.pdf')
            ->assertJsonPath('data.2.direction', 'customer')
            ->assertJsonPath('data.2.form_type', 'bank')
            ->assertJsonPath('data.2.message', '-');
    }

    public function test_unread_company_messages_are_marked_read(): void
    {
        $user = $this->customer();

        $unread = CompanyMessage::factory()->for($user, 'user')->create();
        $foreign = CompanyMessage::factory()->create();

        $this->assertNull($unread->read_at);

        $response = $this->actingAs($user)
            ->getJson("/api/customers/{$user->id}/postfach")
            ->assertOk();

        $this->assertNotNull($unread->refresh()->read_at);
        $this->assertNull($foreign->refresh()->read_at);

        $response->assertJsonPath('data.0.read_at', fn (mixed $readAt): bool => is_string($readAt));
    }

    public function test_a_foreign_user_cannot_read_the_thread(): void
    {
        $user = $this->customer();
        $foreignUser = User::factory()->create();

        $this->actingAs($foreignUser)
            ->getJson("/api/customers/{$user->id}/postfach")
            ->assertForbidden();
    }

    public function test_a_guest_gets_401(): void
    {
        $user = $this->customer();

        $this->getJson("/api/customers/{$user->id}/postfach")
            ->assertUnauthorized();
    }
}
