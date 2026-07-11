<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | KVS / Pebs customer-data-api
    |--------------------------------------------------------------------------
    |
    | Master data source for contracts, invoices, meter points, payment plans
    | and load profiles. The token is a personal access token issued in the
    | KVS database.
    |
    */

    'url' => env('CUSTOMER_DATA_API_URL', ''),
    'root' => env('CUSTOMER_DATA_API_ROOT', ''),
    'token' => env('CUSTOMER_DATA_API_TOKEN', ''),

];
