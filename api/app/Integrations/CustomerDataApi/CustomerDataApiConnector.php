<?php

declare(strict_types=1);

namespace App\Integrations\CustomerDataApi;

use App\Integrations\CustomerDataApi\Exceptions\ContractNotFoundException;
use App\Integrations\CustomerDataApi\Exceptions\CustomerDataApiAuthException;
use App\Integrations\CustomerDataApi\Exceptions\CustomerDataApiRequestFailedException;
use Saloon\Http\Auth\TokenAuthenticator;
use Saloon\Http\Connector;
use Saloon\Http\Response;
use Saloon\Traits\Plugins\AcceptsJson;
use Saloon\Traits\Plugins\AlwaysThrowOnErrors;
use Throwable;

/**
 * Connector for the KVS/Pebs customer-data-api (master data source for
 * contracts, invoices, meter points, payment plans and load profiles).
 */
final class CustomerDataApiConnector extends Connector
{
    use AcceptsJson;
    use AlwaysThrowOnErrors;

    private string $baseUrl;

    private string $token;

    public function __construct()
    {
        $url = config('customer-data-api.url');
        $root = config('customer-data-api.root');
        $token = config('customer-data-api.token');

        $this->baseUrl = (is_string($url) ? $url : '').(is_string($root) ? $root : '');
        $this->token = is_string($token) ? $token : '';
    }

    public function resolveBaseUrl(): string
    {
        return $this->baseUrl;
    }

    protected function defaultAuth(): TokenAuthenticator
    {
        return new TokenAuthenticator($this->token);
    }

    public function getRequestException(Response $response, ?Throwable $senderException): Throwable
    {
        $status = $response->status();

        if ($status === 401) {
            return new CustomerDataApiAuthException('Authentifizierung wurde abgelehnt. Fehlercode 401.', $status, $senderException);
        }

        $request = $response->getRequest();

        if ($status === 404 && $request instanceof ProvidesNotFoundMessages) {
            return new ContractNotFoundException($request->notFoundMessage(), $status, $senderException);
        }

        return new CustomerDataApiRequestFailedException(
            "Anfrage an die Kundendaten-API ist fehlgeschlagen. Fehlercode {$status}.",
            $status,
            $senderException,
        );
    }
}
