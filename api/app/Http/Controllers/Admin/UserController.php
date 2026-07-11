<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Resources\Admin\AdminUserResource;
use App\Models\ContractToUser;
use App\Models\User;
use App\Services\ContractAssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Customer user management: listing (old Company\UserController) and the
 * create / delete / setup-mail actions of the old CustomerUserController.
 */
final readonly class UserController
{
    public function __construct(
        private ContractAssignmentService $assignments,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'id' => ['nullable', 'integer'],
            'name' => ['nullable', 'string'],
            'email' => ['nullable', 'string'],
            'verified' => ['nullable', 'in:verified,unverified'],
            'has_set_password' => ['nullable', 'in:yes,no'],
        ]);

        $query = User::query()
            ->where('admin', false)
            ->orderBy('created_at', 'desc');

        if ($request->filled('id')) {
            $query->where('id', $request->integer('id'));
        }

        if ($request->filled('name')) {
            $query->where('name', 'like', '%'.$request->string('name')->value().'%');
        }

        if ($request->filled('email')) {
            $query->where('email', 'like', '%'.$request->string('email')->value().'%');
        }

        if ($request->filled('verified')) {
            $request->string('verified')->value() === 'verified'
                ? $query->whereNotNull('email_verified_at')
                : $query->whereNull('email_verified_at');
        }

        if ($request->filled('has_set_password')) {
            $request->string('has_set_password')->value() === 'yes'
                ? $query->whereNotNull('password')
                : $query->whereNull('password');
        }

        $users = $query->paginate(25);

        /** @var list<User> $items */
        $items = array_values($users->items());

        $assignments = ContractToUser::withUnconfirmed()
            ->whereIn('user_id', array_map(static fn (User $user): int => $user->id, $items))
            ->orderBy('id')
            ->get()
            ->groupBy('user_id');

        return response()->json([
            'data' => array_map(
                static fn (User $user): AdminUserResource => new AdminUserResource(
                    $user,
                    array_values($assignments->get($user->id)?->all() ?? []),
                ),
                $items,
            ),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->assignments->createCustomerUser(
            name: $request->string('name')->value(),
            email: $request->string('email')->value(),
            contractNumber: $request->filled('contract_number') ? $request->integer('contract_number') : null,
            sendSetupMail: $request->boolean('send_mail'),
        );

        $userAssignments = array_values(
            ContractToUser::withUnconfirmed()
                ->where('user_id', $user->id)
                ->get()
                ->all(),
        );

        return response()->json([
            'data' => new AdminUserResource($user, $userAssignments),
            'message' => "Benutzer {$user->name} angelegt.",
        ], 201);
    }

    public function destroy(User $user): JsonResponse
    {
        $userName = $user->name;

        $this->assignments->deleteUser($user);

        return response()->json([
            'message' => "Benutzer {$userName} wurde gelöscht.",
        ]);
    }

    public function sendSetupMail(User $user): JsonResponse
    {
        $sentPasswordReset = $this->assignments->sendSetupMail($user);

        return response()->json([
            'message' => $sentPasswordReset
                ? "Passwort-Reset-Mail wurde an {$user->name} gesendet."
                : "Einladungs-Mail wurde an {$user->name} gesendet.",
        ]);
    }
}
