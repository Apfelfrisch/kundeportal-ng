<?php

declare(strict_types=1);

return [
    'company' => [
        'client' => 'voltaik-check',
        'name' => [
            'long' => 'Voltaik Check Inh. Enno Jürgens e.K.',
            'short' => 'Voltaik Strom',
        ],
        'legal' => [
            'district-court' => 'Amtsgericht Aurich, HRA 203438',
            'sales_tax_id' => 'DE 266007518 ',
            'tax-number' => '60/233/15104',
            'managing_director' => 'Vertreten durch: Enno Jürgens',
            'creditor_identification_number' => 'DE61ZZZ00002713998', // Gläubiger-Identifikationsnummer
        ],
        'bank' => [
            'name' => 'Sparkasse Emden',
            'iban' => 'DE69284500000021025564',
            'bic' => 'BRLADE21EMD',
        ],
        'website' => [
            'href' => 'https://www.voltaik-strom.de',
            'show' => 'voltaik-strom.de',
        ],
        'contact' => [
            'website' => 'https://voltaik-strom.de/kontakt',
            'messenger' => [
                'telegram' => [
                    'active' => false,
                    'technic' => '+4905555555',
                    'show' => '05555555',
                ],
                'signal' => [
                    'active' => false,
                    'technic' => '+495555555',
                    'show' => '05555555',
                ],
                'whats-app' => [
                    'active' => false,
                    'technic' => '',
                    'show' => '',
                ],
                'sms' => [
                    'active' => false,
                    'technic' => '+4905555555',
                    'show' => '05555555',
                ],
            ],
            'tel' => [
                'technic' => '+4949543059660',
                'show' => '04954 305 9660',
            ],
            'fax' => [
                'technic' => '',
                'show' => '',
            ],
            'email' => 'info@voltaik-strom.de',
            'address' => [
                'street' => 'Borgwardring 19a',
                'city' => '26802 Moormerland',
            ],
            'opening-hours' => [
                'long' => 'Montags bis Freitags von 08:00 - 13:00 Uhr ',
                'short' => '',
            ],
        ],
        'mail' => [
            'greeting' => 'Moin,',
            'adoption' => 'Mit spannenden Grüßen',
            'adoption-name' => 'Ihr Voltaik Strom Team',
        ],
        'app' => [
            'dynamic-electric-prices' => false,
            'edi-load-profiles' => false,
        ],
    ],
    // Daten kommen über die API, falls sich mal was ändert kann das hier zentral angepasst werden.
    // Deshalb hier das mapping
    'partner' => [],
];
