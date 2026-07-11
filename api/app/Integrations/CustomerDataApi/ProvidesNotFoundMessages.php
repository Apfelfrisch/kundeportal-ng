<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi;

/**
 * Implemented by requests whose 404 / empty responses must be translated into
 * a ContractNotFoundException with the German messages of the old repositories.
 */
interface ProvidesNotFoundMessages
{
    /**
     * Message for a 404 response, e.g. "Vertrag 123 wurde im System nicht gefunden. Fehlercode 404.".
     */
    public function notFoundMessage(): string;

    /**
     * Message for a 2xx response without a usable `data` key,
     * e.g. "Vertrag 123 wurde im System nicht gefunden. Rückgabe leer.".
     */
    public function emptyResponseMessage(): string;
}
