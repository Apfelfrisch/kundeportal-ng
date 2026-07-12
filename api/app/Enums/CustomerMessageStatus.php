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

    /**
     * The status string used on the API level (open|in_process|processed).
     */
    public function apiStatus(): string
    {
        return match ($this) {
            self::UnProcessed => 'open',
            self::InProcess => 'in_process',
            self::Processed => 'processed',
        };
    }

    public static function fromApiStatus(string $value): self
    {
        return match ($value) {
            'open' => self::UnProcessed,
            'in_process' => self::InProcess,
            default => self::Processed,
        };
    }

    /**
     * @return list<string>
     */
    public static function apiStatuses(): array
    {
        return array_map(static fn (self $status): string => $status->apiStatus(), self::cases());
    }
}
