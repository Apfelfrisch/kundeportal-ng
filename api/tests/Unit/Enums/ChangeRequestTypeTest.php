<?php

declare(strict_types=1);

namespace Tests\Unit\Enums;

use App\Enums\ChangeRequestType;
use PHPUnit\Framework\TestCase;
use ValueError;

final class ChangeRequestTypeTest extends TestCase
{
    public function test_it_covers_all_change_request_form_types(): void
    {
        // CONTACT is the mailbox chat, not a change-request form.
        $this->assertSame([
            'bank',
            'billing-address',
            'delivery-address',
            'contact-data',
            'installment',
            'meter-count',
            'termination',
            'revocation',
        ], ChangeRequestType::formTypeValues());
    }

    public function test_it_can_be_resolved_from_the_route_parameter(): void
    {
        $this->assertSame(ChangeRequestType::BANK, ChangeRequestType::from('bank'));
        $this->assertSame(ChangeRequestType::BILLING_ADDRESS, ChangeRequestType::from('billing-address'));
        $this->assertSame(ChangeRequestType::METER_COUNT, ChangeRequestType::from('meter-count'));
    }

    public function test_unknown_form_types_are_rejected(): void
    {
        $this->expectException(ValueError::class);

        ChangeRequestType::from('unknown');
    }
}
