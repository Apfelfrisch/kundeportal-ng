<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Resources\Admin\AdminContractResource;
use App\Integrations\CustomerDataApi\Data\ContractData;
use App\Models\ContractToUser;
use App\Services\ContractAssignmentService;
use App\Services\ContractService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin contract listing (old Company\ContractController@index backed by the
 * AdminContractsRepository) plus the confirmation-mail resend.
 */
final readonly class ContractController
{
    public function __construct(
        private ContractService $contracts,
        private ContractAssignmentService $assignments,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'contract_number' => ['nullable', 'integer'],
            'name' => ['nullable', 'string'],
            'email' => ['nullable', 'string'],
            'user_filter' => ['nullable', 'in:with_user,without_user'],
        ]);

        $page = $this->contracts->searchAdmin(
            contractNumber: $request->filled('contract_number') ? $request->integer('contract_number') : null,
            name: $request->filled('name') ? $request->string('name')->value() : null,
            email: $request->filled('email') ? $request->string('email')->value() : null,
            page: max(1, $request->integer('page', 1)),
        );

        $assignments = ContractToUser::withUnconfirmed()
            ->with('user')
            ->whereIn('contract_number', array_map(
                static fn (ContractData $contract): int => $contract->contractNumber,
                $page->items,
            ))
            ->get()
            ->keyBy('contract_number');

        $items = $page->items;

        // The old repository filtered the already fetched page in memory and
        // left the pagination meta untouched — kept for parity.
        $userFilter = $request->string('user_filter')->value();

        if ($userFilter === 'with_user') {
            $items = array_values(array_filter(
                $items,
                static fn (ContractData $contract): bool => $assignments->has($contract->contractNumber),
            ));
        } elseif ($userFilter === 'without_user') {
            $items = array_values(array_filter(
                $items,
                static fn (ContractData $contract): bool => ! $assignments->has($contract->contractNumber),
            ));
        }

        return response()->json([
            'data' => array_map(
                static fn (ContractData $contract): AdminContractResource => new AdminContractResource(
                    $contract,
                    $assignments->get($contract->contractNumber),
                ),
                $items,
            ),
            'meta' => [
                'current_page' => $page->currentPage,
                'last_page' => $page->lastPage,
                'total' => $page->total,
            ],
        ]);
    }

    public function resendConfirmation(int $contractNumber): JsonResponse
    {
        $this->assignments->resendConfirmation($contractNumber);

        return response()->json([
            'message' => "Bestätigungsmail für Vertrag {$contractNumber} wurde erneut versandt.",
        ]);
    }
}
