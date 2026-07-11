<?php

declare(strict_types=1);

namespace Tests\Integration\CustomerDataApi;

use App\Integrations\CustomerDataApi\CustomerDataApiConnector;
use Saloon\Http\Faking\MockClient;
use Saloon\Http\PendingRequest;
use Tests\TestCase;

abstract class CustomerDataApiTestCase extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('customer-data-api.url', 'https://kvs.test');
        config()->set('customer-data-api.root', '/api/v1');
        config()->set('customer-data-api.token', 'secret-token');
    }

    protected function connector(MockClient $mockClient): CustomerDataApiConnector
    {
        $connector = new CustomerDataApiConnector;
        $connector->withMockClient($mockClient);

        return $connector;
    }

    protected function lastPendingRequest(MockClient $mockClient): PendingRequest
    {
        $pendingRequest = $mockClient->getLastPendingRequest();

        $this->assertNotNull($pendingRequest);

        return $pendingRequest;
    }

    protected function assertRequestPath(MockClient $mockClient, string $expectedPath): void
    {
        $url = $this->lastPendingRequest($mockClient)->getUrl();

        $this->assertSame($expectedPath, parse_url($url, PHP_URL_PATH));
    }

    protected function assertKvsTokenSent(MockClient $mockClient): void
    {
        $this->assertSame(
            'Bearer secret-token',
            $this->lastPendingRequest($mockClient)->headers()->get('Authorization'),
        );
    }
}
