<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\CompanyMessage;
use App\Models\CustomerMessage;
use App\Models\User;

/**
 * Authorization matrix for the whole admin area: guests get 401, customers
 * (non-admins) the German 403 of the EnsureAdmin middleware.
 *
 * The model-bound routes (tickets, messages) target EXISTING records: for
 * unknown ids Laravel resolves the binding before the admin middleware and
 * answers 404.
 */
final class AdminAccessTest extends AdminTestCase
{
    /**
     * @return list<array{0: 'getJson'|'postJson'|'putJson'|'deleteJson', 1: string}>
     */
    private function endpoints(): array
    {
        $ticket = CustomerMessage::factory()->create();
        $message = CompanyMessage::factory()->create();

        return [
            ['getJson', '/api/admin/dashboard'],
            ['getJson', '/api/admin/contracts'],
            ['postJson', '/api/admin/contracts/123456/resend-confirmation'],
            ['getJson', '/api/admin/users'],
            ['postJson', '/api/admin/users'],
            ['deleteJson', '/api/admin/users/1'],
            ['postJson', '/api/admin/users/1/setup-mail'],
            ['postJson', '/api/admin/contract-assignments'],
            ['deleteJson', '/api/admin/contract-assignments/1'],
            ['getJson', '/api/admin/tickets'],
            ['putJson', "/api/admin/tickets/{$ticket->id}/status"],
            ['getJson', '/api/admin/outbox'],
            ['postJson', '/api/admin/messages'],
            ['deleteJson', "/api/admin/messages/{$message->id}"],
            ['getJson', '/api/admin/search/contract'],
            ['getJson', '/api/admin/search/user'],
            ['getJson', '/api/admin/profile'],
            ['putJson', '/api/admin/profile/email'],
            ['putJson', '/api/admin/profile/password'],
        ];
    }

    public function test_guests_are_rejected_on_every_admin_endpoint(): void
    {
        foreach ($this->endpoints() as [$method, $uri]) {
            $response = match ($method) {
                'getJson' => $this->getJson($uri),
                'postJson' => $this->postJson($uri),
                'putJson' => $this->putJson($uri),
                'deleteJson' => $this->deleteJson($uri),
            };

            $response->assertUnauthorized();
        }
    }

    public function test_customers_are_rejected_with_the_german_403(): void
    {
        $customer = User::factory()->create();

        foreach ($this->endpoints() as [$method, $uri]) {
            $this->actingAs($customer);

            $response = match ($method) {
                'getJson' => $this->getJson($uri),
                'postJson' => $this->postJson($uri),
                'putJson' => $this->putJson($uri),
                'deleteJson' => $this->deleteJson($uri),
            };

            $response->assertForbidden()
                ->assertJsonPath('message', 'Nur für Mitarbeiter zugänglich.');
        }
    }
}
