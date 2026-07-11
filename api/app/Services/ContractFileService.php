<?php

declare(strict_types=1);

namespace App\Services;

use App\Integrations\CustomerDataApi\Data\ContractData;
use App\Integrations\CustomerDataApi\Data\ContractFileData;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Resolves a contract file from the KVS payload (keyed by the file's KVS id,
 * like the old ContractFileRepository) and reads it from the Pebs S3 disk.
 */
final readonly class ContractFileService
{
    private const string DISK = 'customer-api';

    /**
     * @throws NotFoundHttpException when the contract has no such file or the blob is missing on the disk
     */
    public function findOrFail(ContractData $contract, int $fileId): ContractFileData
    {
        foreach ($contract->contractFiles as $contractFile) {
            if ($contractFile->id === $fileId) {
                if ($contractFile->path === null || ! Storage::disk(self::DISK)->exists($contractFile->path)) {
                    break;
                }

                return $contractFile;
            }
        }

        throw new NotFoundHttpException('Das Dokument wurde nicht gefunden.');
    }

    /**
     * @return resource
     */
    public function readStream(ContractFileData $contractFile)
    {
        if ($contractFile->path === null) {
            throw new NotFoundHttpException('Das Dokument wurde nicht gefunden.');
        }

        $stream = Storage::disk(self::DISK)->readStream($contractFile->path);

        if (! is_resource($stream)) {
            throw new NotFoundHttpException('Das Dokument wurde nicht gefunden.');
        }

        return $stream;
    }
}
