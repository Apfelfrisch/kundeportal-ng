<?php

declare(strict_types=1);

namespace Tests\Unit\Enums;

use App\Enums\ContractStatus;
use PHPUnit\Framework\TestCase;
use ValueError;

final class ContractStatusTest extends TestCase
{
    public function test_the_german_labels_are_preserved(): void
    {
        $this->assertSame('In Bearbeitung', ContractStatus::IN_APPLICATION->value);
        $this->assertSame('In Belieferung', ContractStatus::IN_DELIVERY->value);
        $this->assertSame('In Kündigung', ContractStatus::IN_TERMINATION->value);
        $this->assertSame('Gekündigt', ContractStatus::TERMINATED->value);
        $this->assertSame('Abgelehnt', ContractStatus::REJECTED->value);
    }

    public function test_it_maps_every_kvs_state_type_id_like_the_old_app(): void
    {
        foreach ([0, 4, 5, 6, 7] as $id) {
            $this->assertSame(ContractStatus::REJECTED, ContractStatus::fromKvsId($id));
        }

        foreach ([1, 2, 8, 9] as $id) {
            $this->assertSame(ContractStatus::IN_APPLICATION, ContractStatus::fromKvsId($id));
        }

        $this->assertSame(ContractStatus::IN_DELIVERY, ContractStatus::fromKvsId(3));

        foreach ([10, 11] as $id) {
            $this->assertSame(ContractStatus::TERMINATED, ContractStatus::fromKvsId($id));
        }
    }

    public function test_it_accepts_the_ids_as_strings_like_the_api_delivers_them(): void
    {
        $this->assertSame(ContractStatus::IN_DELIVERY, ContractStatus::fromKvsId('3'));
        $this->assertSame(ContractStatus::REJECTED, ContractStatus::fromKvsId('0'));
    }

    public function test_unknown_ids_throw(): void
    {
        $this->expectException(ValueError::class);

        ContractStatus::fromKvsId(12);
    }
}
