<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The eight customer change-request (Datenänderung) form types, replacing the
 * old string `form_type` route parameters.
 */
enum ChangeRequestType: string
{
    case BANK = 'bank';
    case BILLING_ADDRESS = 'billing-address';
    case DELIVERY_ADDRESS = 'delivery-address';
    case CONTACT_DATA = 'contact-data';
    case INSTALLMENT = 'installment';
    case METER_COUNT = 'meter-count';
    case TERMINATION = 'termination';
    case REVOCATION = 'revocation';
    case CONTACT = 'contact';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $case): string => $case->value, self::cases());
    }
}
