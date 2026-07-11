<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use PHP_IBAN\IBAN;

/**
 * Ported from the old IbanValidationRule (globalcitizen/php-iban).
 */
final class ValidIban implements ValidationRule
{
    private const string MESSAGE = 'Die angegeben IBAN ist nicht korrekt.';

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail(self::MESSAGE);

            return;
        }

        $iban = new IBAN($value);

        if (! $iban->Verify()) {
            $fail(self::MESSAGE);
        }
    }
}
