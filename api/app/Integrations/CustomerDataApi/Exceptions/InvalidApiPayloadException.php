<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Exceptions;

final class InvalidApiPayloadException extends CustomerDataApiException
{
    public static function missingKey(string $key): self
    {
        return new self(sprintf('Feld "%s" fehlt in der API-Antwort.', $key));
    }

    public static function wrongType(string $key, string $expectedType, mixed $value): self
    {
        return new self(sprintf(
            'Feld "%s" hat einen ungültigen Wert vom Typ "%s" (erwartet: %s).',
            $key,
            get_debug_type($value),
            $expectedType,
        ));
    }
}
