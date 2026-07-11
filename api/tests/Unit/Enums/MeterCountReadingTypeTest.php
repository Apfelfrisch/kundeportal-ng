<?php

declare(strict_types=1);

namespace Tests\Unit\Enums;

use App\Enums\MeterCountReadingType;
use PHPUnit\Framework\TestCase;
use ValueError;

final class MeterCountReadingTypeTest extends TestCase
{
    public function test_the_german_labels_are_preserved(): void
    {
        $this->assertSame('Monatliche Ablesung', MeterCountReadingType::MONTHLY->value);
        $this->assertSame('Rotation', MeterCountReadingType::ROTATION->value);
        $this->assertSame('Zwischenablesung', MeterCountReadingType::BETWEEN->value);
        $this->assertSame('Endablesung', MeterCountReadingType::END->value);
        $this->assertSame('Anfangsablesung', MeterCountReadingType::START->value);
    }

    public function test_it_maps_the_kvs_reading_type_ids(): void
    {
        $this->assertSame(MeterCountReadingType::MONTHLY, MeterCountReadingType::fromKvsId('MVR'));
        $this->assertSame(MeterCountReadingType::ROTATION, MeterCountReadingType::fromKvsId('PMR'));
        $this->assertSame(MeterCountReadingType::BETWEEN, MeterCountReadingType::fromKvsId('COT'));
        $this->assertSame(MeterCountReadingType::END, MeterCountReadingType::fromKvsId('EMV'));
        $this->assertSame(MeterCountReadingType::START, MeterCountReadingType::fromKvsId('SMV'));
    }

    public function test_unknown_ids_throw(): void
    {
        $this->expectException(ValueError::class);

        MeterCountReadingType::fromKvsId('XXX');
    }
}
