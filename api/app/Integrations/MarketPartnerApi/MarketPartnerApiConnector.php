<?php

declare(strict_types=1);

namespace App\Integrations\MarketPartnerApi;

use Saloon\Http\Auth\TokenAuthenticator;
use Saloon\Http\Connector;
use Saloon\Traits\Plugins\AcceptsJson;
use Saloon\Traits\Plugins\AlwaysThrowOnErrors;

/**
 * Connector for the market partner API delivering spot market (stock
 * exchange) electricity prices. Config shape ported from the old
 * `config/services.php` (`services.marketpartner_api.url` / `.token`).
 */
final class MarketPartnerApiConnector extends Connector
{
    use AcceptsJson;
    use AlwaysThrowOnErrors;

    private string $baseUrl;

    private string $token;

    public function __construct()
    {
        $url = config('services.marketpartner_api.url');
        $token = config('services.marketpartner_api.token');

        $this->baseUrl = is_string($url) ? $url : '';
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
}
