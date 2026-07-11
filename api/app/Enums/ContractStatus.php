<?php

declare(strict_types=1);

namespace App\Enums;

use ValueError;

/**
 * Contract status, ported from the old app. The enum values are the German
 * labels; {@see self::fromKvsId()} maps the numeric KVS state-type ids the
 * customer-data-api delivers in the contract `status` field.
 */
enum ContractStatus: string
{
    case IN_APPLICATION = 'In Bearbeitung';
    case IN_DELIVERY = 'In Belieferung';
    case IN_TERMINATION = 'In Kündigung';
    case TERMINATED = 'Gekündigt';
    case REJECTED = 'Abgelehnt';

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
     * Old ContractStatus::setWithId() — maps the raw KVS state-type id.
     */
    public static function fromKvsId(int|string $stateTypeId): self
    {
        return match ((int) $stateTypeId) {
            0, 4, 5, 6, 7 => self::REJECTED,
            1, 2, 8, 9 => self::IN_APPLICATION,
            3 => self::IN_DELIVERY,
            10, 11 => self::TERMINATED,
            default => throw new ValueError("Unbekannte Status-Id \"{$stateTypeId}\"."),
        };
    }
}
