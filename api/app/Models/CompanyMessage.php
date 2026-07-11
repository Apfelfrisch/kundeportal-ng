<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\CompanyMessageFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A message from staff to a customer (mailbox outbound).
 *
 * @property-read int $id
 * @property string|null $customer_user_id
 * @property string|null $contract_number
 * @property string|null $message
 * @property string|null $subject
 * @property string|null $file
 * @property CarbonImmutable|null $read_at
 */
final class CompanyMessage extends Model
{
    /** @use HasFactory<CompanyMessageFactory> */
    use HasFactory;

    use SoftDeletes;

    protected $fillable = [
        'customer_user_id',
        'contract_number',
        'message',
        'subject',
        'file',
        'read_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'read_at' => 'immutable_datetime',
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
     * @return HasMany<CompanyUploadedFile, $this>
     */
    public function uploadedFiles(): HasMany
    {
        return $this->hasMany(CompanyUploadedFile::class);
    }
}
