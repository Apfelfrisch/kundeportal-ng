<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Models\ContractToUser;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * User row of the admin listing (old company/users.blade.php), including
 * every contract assignment — confirmed or not.
 */
final class AdminUserResource extends JsonResource
{
    /**
     * @param  list<ContractToUser>  $assignments
     */
    public function __construct(
        private readonly User $user,
        private readonly array $assignments,
    ) {
        parent::__construct($user);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->user->id,
            'customer_number' => $this->user->customer_number,
            'name' => $this->user->name,
            'email' => $this->user->email,
            'email_verified' => $this->user->hasVerifiedEmail(),
            'password_set' => $this->user->hasPassword(),
            'created_at' => $this->user->created_at?->toISOString(),
            'contract_assignments' => array_map(
                static fn (ContractToUser $assignment): array => [
                    'id' => $assignment->id,
                    'contract_number' => $assignment->contract_number,
                    'confirmed' => $assignment->confirmed,
                ],
                $this->assignments,
            ),
        ];
    }
}
