<?php

declare(strict_types=1);

namespace Tests\Feature\ChangeData;

use App\Enums\CustomerMessageStatus;
use App\Integrations\CustomerDataApi\Requests\GetContractRequest;
use App\Models\ContractToUser;
use App\Models\CustomerMessage;
use App\Models\User;
use App\Notifications\ChangeDataSubmittedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\Faking\MockResponse;
use Tests\Fixtures\FixtureLoader;
use Tests\TestCase;

abstract class ChangeDataTestCase extends TestCase
{
    use RefreshDatabase;

    /** The tenant contact address of the voltaik-check test client. */
    protected const string COMPANY_EMAIL = 'info@voltaik-strom.de';

    protected const int CONTRACT_NUMBER = 123456;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Referer', 'http://localhost:3000');
    }

    protected function tearDown(): void
    {
        MockClient::destroyGlobal();

        parent::tearDown();
    }

    protected function customerWithContract(bool $confirmed = true): User
    {
        $user = User::factory()->create();

        $factory = ContractToUser::factory()->for($user);

        if (! $confirmed) {
            $factory = $factory->unconfirmed();
        }

        $factory->create(['contract_number' => self::CONTRACT_NUMBER]);

        return $user;
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    protected function mockContract(array $overrides = []): void
    {
        $payload = array_replace(FixtureLoader::data('customer-data-api/contract.json'), $overrides);

        MockClient::global([
            GetContractRequest::class => new MockResponse(['data' => $payload]),
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return TestResponse<\Illuminate\Http\JsonResponse>
     */
    protected function postChangeRequest(User $user, string $type, array $payload): TestResponse
    {
        return $this->actingAs($user)->postJson(
            "/api/customers/{$user->id}/contracts/".self::CONTRACT_NUMBER."/change-requests/{$type}",
            $payload,
        );
    }

    /**
     * Asserts the stored ticket matches the old ChangeData::save() shape:
     * the `data` payload must contain EXACTLY the given keys and values.
     *
     * @param  array<string, mixed>  $expectedData
     */
    protected function assertChangeRequestStored(string $formType, User $user, array $expectedData): CustomerMessage
    {
        $message = CustomerMessage::query()->sole();

        $this->assertSame($formType, $message->form_type);
        $this->assertSame((string) $user->id, $message->customer_user_id);
        $this->assertSame((string) $user->id, $message->user_id);
        $this->assertSame((string) self::CONTRACT_NUMBER, $message->contract_number);
        $this->assertSame(CustomerMessageStatus::UnProcessed, $message->status);
        $this->assertSame(array_keys($expectedData), array_keys($message->data));
        $this->assertSame($expectedData, $message->data);

        return $message;
    }

    protected function assertCompanyWasNotified(string $changeType): void
    {
        Notification::assertSentOnDemand(
            ChangeDataSubmittedNotification::class,
            fn (ChangeDataSubmittedNotification $notification, array $channels, AnonymousNotifiable $notifiable): bool => ($notifiable->routes['mail'] ?? null) === self::COMPANY_EMAIL
                && $notification->changeType === $changeType
                && $notification->contractNumber === self::CONTRACT_NUMBER,
        );
    }

    /**
     * @param  TestResponse<\Illuminate\Http\JsonResponse>  $response
     */
    protected function assertInfoTextReturned(TestResponse $response): void
    {
        $info = $response->json('info');

        $this->assertIsString($info);
        $this->assertStringContainsString('Deine Änderungen wurden übermittelt – Danke!', $info);
        $this->assertStringContainsString('Kundenchat', $info);
    }
}
