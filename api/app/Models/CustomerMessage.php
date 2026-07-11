<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CustomerMessageStatus;
use Database\Factories\CustomerMessageFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A message from a customer: either a change request (form_type = bank,
 * installment, ...) or a chat message (form_type = contact). Works as the
 * staff ticket queue — nothing is written back to the KVS.
 *
 * @property-read int $id
 * @property string $form_type
 * @property string|null $customer_user_id
 * @property string|null $customer_message_id
 * @property string|null $contract_number
 * @property string $user_id
 * @property array<string, mixed> $data
 * @property bool $processed
 * @property CustomerMessageStatus $status
 * @property int|null $caseworker
 */
final class CustomerMessage extends Model
{
    /** @use HasFactory<CustomerMessageFactory> */
    use HasFactory;

    use SoftDeletes;

    protected $fillable = [
        'form_type',
        'customer_user_id',
        'customer_message_id',
        'contract_number',
        'user_id',
        'data',
        'processed',
        'status',
        'caseworker',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'data' => 'array',
            'processed' => 'boolean',
            'status' => CustomerMessageStatus::class,
            'caseworker' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function caseWorker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'caseworker');
    }

    /**
     * @return HasMany<CustomerUploadedFile, $this>
     */
    public function uploadedFiles(): HasMany
    {
        return $this->hasMany(CustomerUploadedFile::class);
    }
}
