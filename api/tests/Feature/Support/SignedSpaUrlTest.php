<?php

declare(strict_types=1);

namespace Tests\Feature\Support;

use App\Support\SignedSpaUrl;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

final class SignedSpaUrlTest extends TestCase
{
    public function test_replaces_scheme_host_and_path_and_keeps_the_query_string(): void
    {
        config()->set('app.frontend_url', 'https://portal.example.de');

        $url = SignedSpaUrl::toFrontend(
            'http://localhost/api/auth/account-setup/5/abc123?expires=1700000000&signature=deadbeef',
            '/account/einrichten',
        );

        $this->assertSame(
            'https://portal.example.de/account/einrichten?expires=1700000000&signature=deadbeef',
            $url,
        );
    }

    public function test_trailing_slash_on_the_frontend_url_is_normalized(): void
    {
        config()->set('app.frontend_url', 'https://portal.example.de/');

        $url = SignedSpaUrl::toFrontend('http://localhost/api/x?a=1', '/pfad');

        $this->assertSame('https://portal.example.de/pfad?a=1', $url);
    }

    public function test_urls_without_a_query_string_get_no_question_mark(): void
    {
        config()->set('app.frontend_url', 'https://portal.example.de');

        $url = SignedSpaUrl::toFrontend('http://localhost/api/x', '/pfad');

        $this->assertSame('https://portal.example.de/pfad', $url);
    }

    public function test_signed_route_query_survives_the_conversion(): void
    {
        $signed = URL::signedRoute('contract.confirm', [
            'contract_number' => 123456,
            'contract' => 123456,
        ]);

        $frontendUrl = SignedSpaUrl::toFrontend($signed, '/vertrag-bestaetigen');

        $expectedQuery = (string) parse_url($signed, PHP_URL_QUERY);
        $frontendQuery = (string) parse_url($frontendUrl, PHP_URL_QUERY);

        $this->assertNotSame('', $expectedQuery);
        $this->assertSame($expectedQuery, $frontendQuery);
        $this->assertStringStartsWith('http://localhost:3000/vertrag-bestaetigen?', $frontendUrl);
    }
}
