<?php

declare(strict_types=1);

return [
    'company' => [
        'client' => 'friesen-werk',
        'name' => [
            'long' => 'FriesenWerk GmbH',
            'short' => 'FriesenWerk',
        ],
        'legal' => [
            'district-court' => 'Amtsgericht Aurich, HRA 203438',
            'sales_tax_id' => 'DE457756891',
            'tax-number' => '60/203/10780',
            'managing_director' => 'Vertreten durch: Sina Saathoff und Sara Wübbena',
            'creditor_identification_number' => 'DE55ZZZ00002900637', // Gläubiger-Identifikationsnummer
        ],
        'bank' => [
            'name' => 'FYRST',
            'iban' => 'DE30240703680087739900',
            'bic' => 'DEUTDE2HP22',
        ],
        'website' => [
            'href' => 'https://friesen-werk.de',
            'show' => 'friesen-werk.de',
        ],
        'kvs' => [
            'root' => env('KVS_APP_URL'),
            'customer' => '/kunde/show',
        ],
        'contact' => [
            'website' => 'https://friesen-werk.de',
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
                    'active' => true,
                    'technic' => '+4915143396606',
                    'show' => '015143396606',
                ],
                'sms' => [
                    'active' => false,
                    'technic' => '+4905555555',
                    'show' => '05555555',
                ],
            ],
            'tel' => [
                'technic' => '+4949549320900',
                'show' => '04954 93209 00',
            ],
            'fax' => [
                'technic' => '',
                'show' => '',
            ],
            'email' => 'moin@friesen-werk.de',
            'address' => [
                'street' => 'Rudolfswieke 146',
                'city' => '26802 Moormerland',
            ],
            'opening-hours' => [
                'long' => 'Montags bis Freitags von 09:00 - 16:00 Uhr ',
                'short' => '',
            ],
        ],
        'mail' => [
            'greeting' => 'Moin,',
            'adoption' => 'Beste Grüße aus Ostfriesland',
            'adoption-name' => 'Ihr FriesenWerk Team',
        ],
        'app' => [
            'dynamic-electric-prices' => true,
            'edi-load-profiles' => true,
        ],
    ],
    // Daten kommen über die API, falls sich mal was ändert kann das hier zentral angepasst werden.
    // Deshalb hier das mapping
    'partner' => [
        '1' => 'fw',
        '2' => 'cclp',
        '3' => 'fen',
    ],
];
