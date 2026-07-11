<?php

declare(strict_types=1);

namespace App\Http\Controllers\Charts;

use App\Http\Controllers\Charts\Concerns\ResolvesRequestedDate;
use App\Http\Resources\Charts\MarketPriceDayResource;
use App\Integrations\CustomerDataApi\Exceptions\CustomerDataApiException;
use App\Models\User;
use App\Services\ContractService;
use App\Services\MarketPriceService;
use Illuminate\Http\Request;
use Saloon\Exceptions\Request\FatalRequestException;

/**
 * Spot market prices for the "Börsenpreise" chart, replacing the old
 * ExchangeElectricityPricesController.
 */
final class MarketPriceController
{
    use ResolvesRequestedDate;

    public function __construct(
        private readonly MarketPriceService $marketPriceService,
        private readonly ContractService $contractService,
    ) {}

    public function __invoke(Request $request, User $user): MarketPriceDayResource
    {
        $day = $this->marketPriceService->day($this->requestedDate($request));

        return new MarketPriceDayResource($day['date'], $day['prices'], $this->tariffCosts($user));
    }

    /**
     * Working price components of the user's first dynamic contract in
     * ct/kWh, without the spot purchase — the constant surcharge the chart
     * can add on top of the spot price ("inkl. Tarifkosten"). KVS problems
     * must never break the market prices themselves → null.
     *
     * @return array{total_ct: float, components: array<string, float>}|null
     */
    private function tariffCosts(User $user): ?array
    {
        try {
            $contracts = $this->contractService->listForUser($user);
        } catch (CustomerDataApiException|FatalRequestException) {
            return null;
        }

        foreach ($contracts as $contract) {
            if (! $contract->isDynamic()) {
                continue;
            }

            $components = $contract->workingPriceComponentCollection();

            return [
                'total_ct' => round($components->calculatedDynamicWorkingPriceCt(), 4),
                'components' => $components->translatedCentAmounts(dynamic: true),
            ];
        }

        return null;
    }
}
