<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Models\User;
use App\Services\ContractFileService;
use App\Services\ContractService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Streams a contract document (PDF) from the Pebs S3 disk. Response headers
 * ported from the old ContractFileController: forced application/pdf and the
 * path's basename as filename, inline unless ?download=1.
 */
final class ContractFileController
{
    public function __construct(
        private readonly ContractService $contractService,
        private readonly ContractFileService $contractFileService,
    ) {}

    public function show(Request $request, User $user, int $contractNumber, int $fileId): StreamedResponse
    {
        $actingUser = $request->user();

        abort_unless($actingUser instanceof User, 401);

        $contract = $this->contractService->findForUser($actingUser, $user, $contractNumber);
        $contractFile = $this->contractFileService->findOrFail($contract, $fileId);

        $stream = $this->contractFileService->readStream($contractFile);
        $disposition = $request->boolean('download') ? 'attachment' : 'inline';

        return response()->stream(static function () use ($stream): void {
            fpassthru($stream);
        }, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => $disposition.'; filename="'.basename((string) $contractFile->path).'"',
        ]);
    }
}
