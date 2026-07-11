<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Audit log of every mail sent to a user, written by the LogUserMail
 * listener on MessageSent.
 *
 * @property-read int $id
 * @property int|null $user_id
 * @property string $email
 * @property string|null $type
 * @property string $subject
 */
final class UserMailLog extends Model
{
    use SoftDeletes;

    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'email',
        'type',
        'subject',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
