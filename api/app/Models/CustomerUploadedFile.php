<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\CustomerUploadedFileFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * File a customer attached to a mailbox message; stored on the local disk.
 *
 * @property-read int $id
 * @property int $customer_message_id
 * @property int $user_id
 * @property int $customer_user_id
 * @property string $name
 * @property string $path
 * @property string $mime_type
 * @property bool $processed
 */
final class CustomerUploadedFile extends Model
{
    /** @use HasFactory<CustomerUploadedFileFactory> */
    use HasFactory;

    use SoftDeletes;

    protected $table = 'customer_uploaded_files';

    protected $fillable = [
        'customer_message_id',
        'user_id',
        'customer_user_id',
        'name',
        'path',
        'mime_type',
        'processed',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'customer_message_id' => 'integer',
            'user_id' => 'integer',
            'customer_user_id' => 'integer',
            'processed' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<CustomerMessage, $this>
     */
    public function message(): BelongsTo
    {
        return $this->belongsTo(CustomerMessage::class, 'customer_message_id');
    }
}
