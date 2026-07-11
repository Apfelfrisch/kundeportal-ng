<?php

declare(strict_types=1);

namespace Tests\Unit\Enums;

use App\Enums\MeterCountReadingKind;
use PHPUnit\Framework\TestCase;
use ValueError;

final class MeterCountReadingKindTest extends TestCase
{
    public function test_the_german_labels_are_preserved(): void
    {
        $this->assertSame('Netzmeldung', MeterCountReadingKind::DNO->value);
        $this->assertSame('Ablesung', MeterCountReadingKind::CUSTOMER->value);
        $this->assertSame('Schätzung', MeterCountReadingKind::APPRECIATED->value);
    }

    public function test_it_maps_the_kvs_reading_kind_ids(): void
    {
        $this->assertSame(MeterCountReadingKind::DNO, MeterCountReadingKind::fromKvsId('220'));
        $this->assertSame(MeterCountReadingKind::CUSTOMER, MeterCountReadingKind::fromKvsId('87'));
        $this->assertSame(MeterCountReadingKind::APPRECIATED, MeterCountReadingKind::fromKvsId('67'));
        $this->assertSame(MeterCountReadingKind::DNO, MeterCountReadingKind::fromKvsId(220));
    }

    public function test_unknown_ids_throw(): void
    {
        $this->expectException(ValueError::class);

        MeterCountReadingKind::fromKvsId('999');
    }
}
