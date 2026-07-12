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
     * The form types a change request can be submitted for. CONTACT is the
     * mailbox chat, not a change-request form, so it is excluded.
     *
     * @return list<string>
     */
    public static function formTypeValues(): array
    {
        $values = [];

        foreach (self::cases() as $case) {
            if ($case !== self::CONTACT) {
                $values[] = $case->value;
            }
        }

        return $values;
    }
}
