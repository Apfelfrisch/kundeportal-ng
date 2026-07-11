<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Support\TenantConfig;
use Illuminate\Http\JsonResponse;

/**
 * Public branding/feature endpoint: everything the SPA needs to render the
 * white-label tenant (name, contact channels, legal block, feature flags).
 */
final class TenantController
{
    public function __invoke(TenantConfig $tenant): JsonResponse
    {
        return response()->json([
            'data' => [
                'slug' => $tenant->slug,
                'name' => [
                    'long' => $tenant->companyNameLong(),
                    'short' => $tenant->companyName(),
                ],
                'website' => $tenant->website,
                'contact' => $tenant->contact,
                'legal' => $tenant->legal,
                'bank' => $tenant->bank,
                'features' => [
                    'dynamic_electric_prices' => $tenant->dynamicElectricPrices,
                    'edi_load_profiles' => $tenant->ediLoadProfiles,
                ],
            ],
        ]);
    }
}
