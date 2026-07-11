<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\CustomerMessageStatus;
use App\Http\Requests\Admin\UpdateTicketStatusRequest;
use App\Http\Resources\Admin\TicketResource;
use App\Models\CustomerMessage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Staff ticket queue (old Company\CustomerMessageController). The status
 * transition routes were GET in the old app and become one PUT endpoint;
 * every transition assigns the acting admin as caseworker, exactly like the
 * old set* actions did.
 */
final class TicketController
{
    private const int PER_PAGE = 20;

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'in:open,in_process,processed'],
            'name' => ['nullable', 'string'],
            'email' => ['nullable', 'string'],
            'contract_number' => ['nullable', 'string'],
            'caseworker' => ['nullable', 'integer'],
        ]);

        $query = CustomerMessage::query()
            ->latest()
            ->with(['user', 'caseWorker']);

        if ($request->filled('status')) {
            $query->where('status', $this->statusFromFilter($request->string('status')->value()));
        }

        if ($request->filled('contract_number')) {
            $query->where('contract_number', trim($request->string('contract_number')->value()));
        }

        if ($request->filled('caseworker')) {
            $query->where('caseworker', $request->integer('caseworker'));
        }

        if ($request->filled('name') || $request->filled('email')) {
            $userQuery = User::query();

            if ($request->filled('name')) {
                $userQuery->where('name', 'like', '%'.$request->string('name')->value().'%');
            }

            if ($request->filled('email')) {
                $userQuery->where('email', 'like', '%'.$request->string('email')->value().'%');
            }

            $query->whereIn('customer_user_id', $userQuery->select('id'));
        }

        $tickets = $query->paginate(self::PER_PAGE);

        /** @var list<CustomerMessage> $items */
        $items = array_values($tickets->items());

        return response()->json([
            'data' => array_map(
                static fn (CustomerMessage $ticket): TicketResource => new TicketResource($ticket),
                $items,
            ),
            'meta' => [
                'current_page' => $tickets->currentPage(),
                'last_page' => $tickets->lastPage(),
                'total' => $tickets->total(),
            ],
        ]);
    }

    public function updateStatus(UpdateTicketStatusRequest $request, CustomerMessage $customerMessage): JsonResponse
    {
        $admin = $request->user();
        abort_unless($admin instanceof User, 401);

        $customerMessage->update([
            'status' => $request->status(),
            'caseworker' => $admin->id,
        ]);

        $customerMessage->load(['user', 'caseWorker']);

        return response()->json([
            'data' => new TicketResource($customerMessage),
        ]);
    }

    private function statusFromFilter(string $filter): CustomerMessageStatus
    {
        return match ($filter) {
            'open' => CustomerMessageStatus::UnProcessed,
            'in_process' => CustomerMessageStatus::InProcess,
            default => CustomerMessageStatus::Processed,
        };
    }
}
