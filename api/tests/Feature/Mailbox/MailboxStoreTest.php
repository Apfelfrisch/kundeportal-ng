<?php

declare(strict_types=1);

namespace Tests\Feature\Mailbox;

use App\Enums\CustomerMessageStatus;
use App\Models\CustomerMessage;
use App\Models\CustomerUploadedFile;
use App\Models\User;
use App\Notifications\CustomerChatMessageReceivedNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

final class MailboxStoreTest extends MailboxTestCase
{
    public function test_a_chat_message_with_files_is_stored_and_the_company_is_notified(): void
    {
        Storage::fake('local');
        Notification::fake();

        $user = $this->customer();

        $this->actingAs($user)
            ->post("/api/customers/{$user->id}/postfach", [
                'message' => 'Ich habe noch eine Frage zur Abrechnung.',
                'files' => [
                    UploadedFile::fake()->create('rechnung.pdf', 100, 'application/pdf'),
                ],
            ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.form_type', 'contact')
            ->assertJsonPath('data.data.message', 'Ich habe noch eine Frage zur Abrechnung.');

        $message = CustomerMessage::query()->sole();

        $this->assertSame('contact', $message->form_type);
        $this->assertSame((string) $user->id, $message->customer_user_id);
        $this->assertSame((string) $user->id, $message->user_id);
        $this->assertSame(CustomerMessageStatus::UnProcessed, $message->status);
        $this->assertSame(['message' => 'Ich habe noch eine Frage zur Abrechnung.'], $message->data);
        $this->assertNull($message->contract_number);

        $uploadedFile = CustomerUploadedFile::query()->sole();

        $this->assertSame($message->id, $uploadedFile->customer_message_id);
        $this->assertSame($user->id, $uploadedFile->customer_user_id);
        $this->assertSame($user->id, $uploadedFile->user_id);
        $this->assertSame('rechnung.pdf', $uploadedFile->name);
        $this->assertSame('application/pdf', $uploadedFile->mime_type);
        $this->assertStringStartsWith("customer-uploads/{$user->id}/", $uploadedFile->path);
        Storage::disk('local')->assertExists($uploadedFile->path);

        Notification::assertSentOnDemand(
            CustomerChatMessageReceivedNotification::class,
            fn (CustomerChatMessageReceivedNotification $notification, array $channels, AnonymousNotifiable $notifiable): bool => ($notifiable->routes['mail'] ?? null) === self::COMPANY_EMAIL
                && $notification->chatMessage === 'Ich habe noch eine Frage zur Abrechnung.',
        );
    }

    public function test_a_message_without_files_is_stored(): void
    {
        Notification::fake();

        $user = $this->customer();

        $this->actingAs($user)
            ->postJson("/api/customers/{$user->id}/postfach", [
                'message' => 'Nur eine kurze Frage.',
            ])
            ->assertCreated();

        $this->assertDatabaseCount('customer_messages', 1);
        $this->assertDatabaseCount('customer_uploaded_files', 0);
    }

    public function test_an_empty_message_without_files_is_rejected(): void
    {
        Notification::fake();

        $user = $this->customer();

        $this->actingAs($user)
            ->postJson("/api/customers/{$user->id}/postfach", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['message']);

        $this->assertDatabaseCount('customer_messages', 0);
        Notification::assertNothingSent();
    }

    public function test_a_disallowed_file_type_is_rejected(): void
    {
        Storage::fake('local');
        Notification::fake();

        $user = $this->customer();

        $this->actingAs($user)
            ->post("/api/customers/{$user->id}/postfach", [
                'message' => 'Anbei eine Datei.',
                'files' => [
                    UploadedFile::fake()->create('virus.exe', 10, 'application/octet-stream'),
                ],
            ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'files.0' => 'Datei konnte nicht gespeichert werden. Die Datei muss vom Typ JPG, PNG oder PDF sein.',
            ]);

        $this->assertDatabaseCount('customer_messages', 0);
        $this->assertDatabaseCount('customer_uploaded_files', 0);
    }

    public function test_a_filled_bot_check_honeypot_is_rejected(): void
    {
        Notification::fake();

        $user = $this->customer();

        $this->actingAs($user)
            ->postJson("/api/customers/{$user->id}/postfach", [
                'message' => 'Hallo',
                'bot-check' => 'i am a robot',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['bot-check']);

        $this->assertDatabaseCount('customer_messages', 0);
        Notification::assertNothingSent();
    }

    public function test_a_foreign_user_cannot_post_into_the_mailbox(): void
    {
        Notification::fake();

        $user = $this->customer();
        $foreignUser = User::factory()->create();

        $this->actingAs($foreignUser)
            ->postJson("/api/customers/{$user->id}/postfach", ['message' => 'Hallo'])
            ->assertForbidden();

        $this->assertDatabaseCount('customer_messages', 0);
    }

    public function test_a_guest_gets_401(): void
    {
        $user = $this->customer();

        $this->postJson("/api/customers/{$user->id}/postfach", ['message' => 'Hallo'])
            ->assertUnauthorized();
    }
}
