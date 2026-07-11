<?php

declare(strict_types=1);

namespace Tests\Unit\Domain\Pricing;

use App\Domain\Pricing\Vat;
use PHPUnit\Framework\TestCase;

final class VatTest extends TestCase
{
    public function test_the_german_vat_rate_is_119_percent(): void
    {
        $this->assertSame(1.19, Vat::RATE);
    }

    public function test_gross_applies_the_vat_rate(): void
    {
        $this->assertEqualsWithDelta(119.0, Vat::gross(100.0), 1e-9);
        $this->assertEqualsWithDelta(47.5405, Vat::gross(39.95), 1e-9);
        $this->assertSame(0.0, Vat::gross(0.0));
    }
}
