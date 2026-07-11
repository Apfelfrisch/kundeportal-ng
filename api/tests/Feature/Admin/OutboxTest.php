<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\CompanyMessage;
use App\Models\CompanyUploadedFile;
use App\Models\User;
use App\Notifications\NewChatMessageReceivedNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

final class OutboxTest extends AdminTestCase
{
    public function test_the_outbox_lists_messages_with_recipient_and_files(): void
    {
        $admin = $this->admin();
        $customer = User::factory()->create();

        $message = CompanyMessage::factory()->create([
            'customer_user_id' => (string) $customer->id,
            'subject' => 'Ihre Anfrage',
        ]);
        $file = CompanyUploadedFile::factory()->create([
            'company_message_id' => $message->id,
            'customer_user_id' => $customer->id,
            'user_id' => $admin->id,
            'name' => 'antwort.pdf',
        ]);

        $this->actingAs($admin)
            ->getJson('/api/admin/outbox')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $message->id)
            ->assertJsonPath('data.0.subject', 'Ihre Anfrage')
            ->assertJsonPath('data.0.recipient.id', $customer->id)
            ->assertJsonPath('data.0.recipient.email', $customer->email)
            ->assertJsonPath('data.0.files.0.id', $file->id)
            ->assertJsonPath('data.0.files.0.name', 'antwort.pdf')
            ->assertJsonPath('meta.total', 1);
    }

    public function test_the_outbox_can_be_filtered(): void
    {
        $admin = $this->admin();

        $erika = User::factory()->create([
            'name' => 'Erika Musterfrau',
            'email' => 'erika@example.org',
            'customer_number' => '10001',
        ]);
        $max = User::factory()->create([
            'name' => 'Max Mustermann',
            'email' => 'max@example.org',
            'customer_number' => '10002',
        ]);

        $erikaMessage = CompanyMessage::factory()->create(['customer_user_id' => (string) $erika->id]);
        $maxMessage = CompanyMessage::factory()->create(['customer_user_id' => (string) $max->id]);
        $orphanMessage = CompanyMessage::factory()->create(['customer_user_id' => null]);

        $this->actingAs($admin)
            ->getJson('/api/admin/outbox?name=Erika')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $erikaMessage->id);

        $this->actingAs($admin)
            ->getJson('/api/admin/outbox?email=max@')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $maxMessage->id);

        $this->actingAs($admin)
            ->getJson('/api/admin/outbox?customer_number=10001')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $erikaMessage->id);

        $this->actingAs($admin)
            ->getJson('/api/admin/outbox?user_filter=without_user')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $orphanMessage->id);

        $this->actingAs($admin)
            ->getJson('/api/admin/outbox?user_filter=with_user')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_a_message_with_files_can_be_sent(): void
    {
        Notification::fake();
        Storage::fake('local');

        $admin = $this->admin();
        $customer = User::factory()->create();

        $this->actingAs($admin)
            ->postJson('/api/admin/messages', [
                'customer_user_id' => $customer->id,
                'subject' => 'Ihre Unterlagen',
                'message' => 'Anbei die gewünschten Unterlagen.',
                'files' => [
                    UploadedFile::fake()->create('unterlagen.pdf', 100, 'application/pdf'),
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.subject', 'Ihre Unterlagen')
            ->assertJsonPath('data.recipient.id', $customer->id)
            ->assertJsonPath('data.files.0.name', 'unterlagen.pdf')
            ->assertJsonPath('message', 'Nachricht versandt.');

        $message = CompanyMessage::query()->firstOrFail();
        $this->assertSame((string) $customer->id, $message->customer_user_id);

        $file = CompanyUploadedFile::query()->firstOrFail();
        $this->assertSame($message->id, $file->company_message_id);
        $this->assertSame($customer->id, $file->customer_user_id);
        $this->assertSame($admin->id, $file->user_id);
        $this->assertSame('unterlagen.pdf', $file->name);

        Storage::disk('local')->assertExists($file->path);
        $this->assertStringStartsWith("company-uploads/{$customer->id}/", $file->path);

        // The customer is pointed to their SPA mailbox.
        Notification::assertSentTo(
            $customer,
            NewChatMessageReceivedNotification::class,
            fn (NewChatMessageReceivedNotification $notification): bool => $notification->linkToMessage === "http://localhost:3000/kunde/{$customer->id}/postfach",
        );
    }

    public function test_a_message_without_files_can_be_sent(): void
    {
        Notification::fake();

        $customer = User::factory()->create();

        $this->actingAs($this->admin())
            ->postJson('/api/admin/messages', [
                'customer_user_id' => $customer->id,
                'subject' => 'Hallo',
                'message' => 'Nur Text.',
            ])
            ->assertCreated()
            ->assertJsonCount(0, 'data.files');

        $this->assertDatabaseCount('company_uploaded_files', 0);

        Notification::assertSentTo($customer, NewChatMessageReceivedNotification::class);
    }

    public function test_invalid_messages_are_rejected(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($this->admin())
            ->postJson('/api/admin/messages', [
                'customer_user_id' => 999999,
                'subject' => 'Hallo',
                'message' => 'Text',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('customer_user_id');

        $this->actingAs($this->admin())
            ->postJson('/api/admin/messages', [
                'customer_user_id' => $customer->id,
                'subject' => 'Hallo',
                'message' => 'Text',
                'files' => [UploadedFile::fake()->create('script.exe', 10)],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('files.0');
    }

    public function test_a_message_can_be_soft_deleted(): void
    {
        $message = CompanyMessage::factory()->create();

        $this->actingAs($this->admin())
            ->deleteJson("/api/admin/messages/{$message->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Nachricht erfolgreich gelöscht!');

        $this->assertSoftDeleted('company_messages', ['id' => $message->id]);
    }
}
