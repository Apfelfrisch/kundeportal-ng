<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * @property-read int $id
 * @property string|null $customer_number
 * @property string $name
 * @property string $email
 * @property CarbonImmutable|null $email_verified_at
 * @property string|null $password
 * @property bool $admin
 */
final class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory;

    use Notifiable;

    protected $fillable = [
        'customer_number',
        'name',
        'email',
        'password',
        'admin',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'immutable_datetime',
            'password' => 'hashed',
            'admin' => 'boolean',
        ];
    }

    /**
     * @return HasMany<ContractToUser, $this>
     */
    public function contractAssignments(): HasMany
    {
        return $this->hasMany(ContractToUser::class);
    }

    /**
     * Contract numbers the user may access (confirmed assignments only,
     * enforced by ContractToUser's global scope).
     *
     * @return list<int>
     */
    public function contractNumbers(): array
    {
        return array_values(
            $this->contractAssignments()
                ->get()
                ->map(static fn (ContractToUser $assignment): int => $assignment->contract_number)
                ->all(),
        );
    }

    public function isAdministrator(): bool
    {
        return $this->admin;
    }

    public function hasPassword(): bool
    {
        return $this->password !== null;
    }
}
