<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Scopes\ConfirmedScope;
use Database\Factories\ContractToUserFactory;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Local join between a portal user and an external KVS contract number.
 *
 * @property-read int $id
 * @property int $user_id
 * @property int $contract_number
 * @property bool $confirmed
 */
#[ScopedBy(ConfirmedScope::class)]
final class ContractToUser extends Model
{
    /** @use HasFactory<ContractToUserFactory> */
    use HasFactory;

    protected $table = 'contract_to_users';

    protected $fillable = [
        'user_id',
        'contract_number',
        'confirmed',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'contract_number' => 'integer',
            'confirmed' => 'boolean',
        ];
    }

    /**
     * @return Builder<self>
     */
    public static function withUnconfirmed(): Builder
    {
        return self::query()->withoutGlobalScope(ConfirmedScope::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
