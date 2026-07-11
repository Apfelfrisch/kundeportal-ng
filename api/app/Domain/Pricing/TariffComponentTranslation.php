<?php

declare(strict_types=1);

namespace App\Domain\Pricing;

/**
 * German labels for KVS tariff price components, ported 1:1 from the old
 * Contract::$tariffComponentsTranslation map. Unknown components fall back
 * to their raw name (old behaviour: `$translation[$name] ?? $name`).
 */
final class TariffComponentTranslation
{
    private const array MAP = [
        // BasePrice
        'supplierBasePrice' => 'Grundpreis Versorger',
        'baseFee' => 'Grundpreis Netzbetreiber',
        'measuringFee' => 'Messung und Ablesung',
        // WorkingPrice
        'supplierWorkingPrice' => 'Arbeitspreis Versorger',
        'supplierPurchasePrice' => 'Beschaffungskosten',
        'workingPrice' => 'Arbeitspreis Netzbetreiber',
        'concessionFee' => 'Konzessionsabgabe',
        'energyFee' => 'Energiesteuer',
        'eegFee' => 'EEG-Umlage',
        'ablav' => 'Umlage abschaltbare Lasten',
        'kwkFee' => 'Abgabe KWKG',
        'offshoreFee' => 'Offshore-Haftungsumlage',
        'sku' => '§ 19 StromNEV Umlage',
    ];

    public static function translate(string $componentName): string
    {
        return self::MAP[$componentName] ?? $componentName;
    }

    /**
     * @return array<string, string>
     */
    public static function map(): array
    {
        return self::MAP;
    }
}
