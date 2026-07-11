<?php

declare(strict_types=1);

namespace App\Domain\Pricing;

/**
 * German VAT handling, ported from the old Contract model (`private float $vat = 1.19`).
 */
final class Vat
{
    public const float RATE = 1.19;

    public static function gross(float $net): float
    {
        return $net * self::RATE;
    }
}
