<?php

declare(strict_types=1);

namespace App\Enums;

use ValueError;

/**
 * Type of a meter reading, ported from the old app. The enum values are the
 * German labels; {@see self::fromKvsId()} maps the KVS `reading_type` ids.
 */
enum MeterCountReadingType: string
{
    case MONTHLY = 'Monatliche Ablesung';
    case ROTATION = 'Rotation';
    case BETWEEN = 'Zwischenablesung';
    case END = 'Endablesung';
    case START = 'Anfangsablesung';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $case): string => $case->value, self::cases());
    }

    /**
     * @return list<string>
     */
    public static function names(): array
    {
        return array_map(static fn (self $case): string => $case->name, self::cases());
    }

    /**
     * Old MeterCountReadingType::setWithId() — maps the raw KVS reading-type id.
     */
    public static function fromKvsId(string $id): self
    {
        return match ($id) {
            'MVR' => self::MONTHLY,
            'PMR' => self::ROTATION,
            'COT' => self::BETWEEN,
            'EMV' => self::END,
            'SMV' => self::START,
            default => throw new ValueError("Unbekannte Ablesungstyp-Id \"{$id}\"."),
        };
    }
}
