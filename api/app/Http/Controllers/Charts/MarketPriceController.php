<?php

declare(strict_types=1);

namespace App\Http\Controllers\Charts;

use App\Http\Controllers\Charts\Concerns\ResolvesRequestedDate;
use App\Http\Resources\Charts\MarketPriceDayResource;
use App\Models\User;
use App\Services\MarketPriceService;
use Illuminate\Http\Request;

/**
 * Spot market prices for the "Börsenpreise" chart, replacing the old
 * ExchangeElectricityPricesController.
 */
final class MarketPriceController
{
    use ResolvesRequestedDate;

    public function __construct(
        private readonly MarketPriceService $marketPriceService,
    ) {}

    public function __invoke(Request $request, User $user): MarketPriceDayResource
    {
        $day = $this->marketPriceService->day($this->requestedDate($request));

        return new MarketPriceDayResource($day['date'], $day['prices']);
    }
}
