<?php

declare(strict_types=1);

namespace App\Enums;

use ValueError;

/**
 * Kind of a meter reading, ported from the old app. The enum values are the
 * German labels; {@see self::fromKvsId()} maps the KVS `reading_kind` ids.
 */
enum MeterCountReadingKind: string
{
    case DNO = 'Netzmeldung';
    case CUSTOMER = 'Ablesung';
    case APPRECIATED = 'Schätzung';

    /**
     * Old MeterCountReadingKind::setWithId() — maps the raw KVS reading-kind id.
     */
    public static function fromKvsId(int|string $id): self
    {
        return match ((string) $id) {
            '220' => self::DNO,
            '87' => self::CUSTOMER,
            '67' => self::APPRECIATED,
            default => throw new ValueError("Unbekannte Ablesungsart-Id \"{$id}\"."),
        };
    }
}
