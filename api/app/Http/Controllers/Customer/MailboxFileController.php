<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Models\User;
use App\Services\MailboxService;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Streams mailbox attachments from the local disk, ported from the old
 * Customer-/CompanyUploadFileControllers — plus an ownership check the old
 * controllers were missing: the file must belong to the addressed customer.
 */
final class MailboxFileController
{
    public function __construct(
        private readonly MailboxService $mailboxService,
    ) {}

    public function customer(User $user, int $fileId): StreamedResponse
    {
        $file = $this->mailboxService->findCustomerFile($user, $fileId);

        return $this->stream($file->path, $file->mime_type, $file->name);
    }

    public function company(User $user, int $fileId): StreamedResponse
    {
        $file = $this->mailboxService->findCompanyFile($user, $fileId);

        return $this->stream($file->path, $file->mime_type, $file->name);
    }

    private function stream(string $path, string $mimeType, string $name): StreamedResponse
    {
        $stream = $this->mailboxService->readStream($path);

        return response()->stream(static function () use ($stream): void {
            fpassthru($stream);
        }, 200, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="'.$name.'"',
        ]);
    }
}
