<?php

declare(strict_types=1);

namespace App\Enums;

enum CustomerMessageStatus: string
{
    // The stored values mirror the old application (enum ->name was
    // persisted) so existing rows keep working after the data migration.
    case UnProcessed = 'UN_PROCESSED';
    case InProcess = 'IN_PROCESS';
    case Processed = 'PROCESSED';

    public function label(): string
    {
        return match ($this) {
            self::UnProcessed => 'offen',
            self::InProcess => 'in Arbeit',
            self::Processed => 'erledigt',
        };
    }
}
