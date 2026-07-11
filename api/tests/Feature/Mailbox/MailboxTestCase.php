<?php

declare(strict_types=1);

namespace Tests\Feature\Mailbox;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

abstract class MailboxTestCase extends TestCase
{
    use RefreshDatabase;

    /** The tenant contact address of the voltaik-check test client. */
    protected const string COMPANY_EMAIL = 'info@voltaik-strom.de';

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Referer', 'http://localhost:3000');
    }

    protected function customer(): User
    {
        return User::factory()->create(['customer_number' => '10001']);
    }
}
