<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\CompanyUploadedFileFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * File staff attached to a mailbox message; stored on the local disk.
 *
 * @property-read int $id
 * @property int $company_message_id
 * @property int $customer_user_id
 * @property int $user_id
 * @property string $name
 * @property string $path
 * @property string $mime_type
 * @property bool $processed
 */
final class CompanyUploadedFile extends Model
{
    /** @use HasFactory<CompanyUploadedFileFactory> */
    use HasFactory;

    use SoftDeletes;

    protected $table = 'company_uploaded_files';

    protected $fillable = [
        'company_message_id',
        'customer_user_id',
        'user_id',
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
            'company_message_id' => 'integer',
            'customer_user_id' => 'integer',
            'user_id' => 'integer',
            'processed' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<CompanyMessage, $this>
     */
    public function message(): BelongsTo
    {
        return $this->belongsTo(CompanyMessage::class, 'company_message_id');
    }
}
