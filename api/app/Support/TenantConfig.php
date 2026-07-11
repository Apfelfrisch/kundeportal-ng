<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Typed, immutable view on the tenant configuration merged by
 * ClientConfigServiceProvider. Services depend on this instead of calling
 * config('company.*') ad hoc.
 */
final readonly class TenantConfig
{
    /**
     * @param  array<string, string>  $companyNames  keys: long, short
     * @param  array<string, string>  $legal
     * @param  array<string, string>  $bank  keys: name, iban, bic
     * @param  array<string, string>  $website  keys: href, show
     * @param  array<string, mixed>  $contact
     * @param  array<string, string>  $mail  keys: greeting, adoption, adoption-name
     * @param  array<int|string, string>  $salesPartners
     */
    public function __construct(
        public string $slug,
        public array $companyNames,
        public array $legal,
        public array $bank,
        public array $website,
        public array $contact,
        public array $mail,
        public bool $dynamicElectricPrices,
        public bool $ediLoadProfiles,
        public array $salesPartners,
        public ?string $kvsRoot,
    ) {}

    public static function fromConfig(): self
    {
        /** @var array<string, mixed> $company */
        $company = config()->array('company');

        /** @var array<string, mixed> $app */
        $app = $company['app'] ?? [];

        /** @var array<string, mixed> $kvs */
        $kvs = $company['kvs'] ?? [];

        /** @var array<int|string, string> $partners */
        $partners = config()->array('partner');

        /** @var array<string, string> $names */
        $names = $company['name'] ?? [];

        /** @var array<string, string> $legal */
        $legal = $company['legal'] ?? [];

        /** @var array<string, string> $bank */
        $bank = $company['bank'] ?? [];

        /** @var array<string, string> $website */
        $website = $company['website'] ?? [];

        /** @var array<string, mixed> $contact */
        $contact = $company['contact'] ?? [];

        /** @var array<string, string> $mail */
        $mail = $company['mail'] ?? [];

        $slug = $company['client'] ?? null;
        $kvsRoot = $kvs['root'] ?? null;

        return new self(
            slug: is_string($slug) ? $slug : '',
            companyNames: $names,
            legal: $legal,
            bank: $bank,
            website: $website,
            contact: $contact,
            mail: $mail,
            dynamicElectricPrices: (bool) ($app['dynamic-electric-prices'] ?? false),
            ediLoadProfiles: (bool) ($app['edi-load-profiles'] ?? false),
            salesPartners: $partners,
            kvsRoot: is_string($kvsRoot) ? $kvsRoot : null,
        );
    }

    public function companyName(): string
    {
        return $this->companyNames['short'] ?? '';
    }

    public function companyNameLong(): string
    {
        return $this->companyNames['long'] ?? '';
    }

    public function contactEmail(): string
    {
        $email = $this->contact['email'] ?? '';

        return is_string($email) ? $email : '';
    }

    public function salesPartner(int|string|null $id): ?string
    {
        if ($id === null) {
            return null;
        }

        return $this->salesPartners[(string) $id] ?? null;
    }

    public function hasFeature(string $flag): bool
    {
        return match ($flag) {
            'dynamic-electric-prices' => $this->dynamicElectricPrices,
            'edi-load-profiles' => $this->ediLoadProfiles,
            default => false,
        };
    }
}
