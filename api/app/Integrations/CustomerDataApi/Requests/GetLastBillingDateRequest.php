<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi\Requests;

use App\Integrations\CustomerDataApi\Exceptions\InvalidApiPayloadException;
use App\Integrations\CustomerDataApi\ProvidesNotFoundMessages;
use Carbon\CarbonImmutable;
use Carbon\Exceptions\InvalidFormatException;
use Saloon\Enums\Method;
use Saloon\Http\Request;
use Saloon\Http\Response;

/**
 * GET /contract/{contractNumber}/billed-load-profiles/last-billing-date —
 * endpoint path verified against the old BilledContractLoadProfileController::show().
 *
 * The old controller fell back to "yesterday" when the response was not
 * successful or `last_billing_date` was empty — that fallback is endpoint
 * (phase 7) logic; here a missing/empty date simply yields null.
 */
final class GetLastBillingDateRequest extends Request implements ProvidesNotFoundMessages
{
    protected Method $method = Method::GET;

    public function __construct(
        private readonly int $contractNumber,
    ) {}

    public function resolveEndpoint(): string
    {
        return "/contract/{$this->contractNumber}/billed-load-profiles/last-billing-date";
    }

    public function createDtoFromResponse(Response $response): ?CarbonImmutable
    {
        $date = $response->json('last_billing_date');

        if ($date === null || $date === '') {
            return null;
        }

        if (! is_string($date)) {
            throw InvalidApiPayloadException::wrongType('last_billing_date', 'date string', $date);
        }

        try {
            return CarbonImmutable::parse($date);
        } catch (InvalidFormatException) {
            throw InvalidApiPayloadException::wrongType('last_billing_date', 'date string', $date);
        }
    }

    public function notFoundMessage(): string
    {
        return "Vertrag {$this->contractNumber} wurde im System nicht gefunden. Fehlercode 404.";
    }

    public function emptyResponseMessage(): string
    {
        return "Vertrag {$this->contractNumber} wurde im System nicht gefunden. Rückgabe leer.";
    }
}
