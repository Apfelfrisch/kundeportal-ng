<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Integrations\CustomerDataApi\Data\ContractFileData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ContractFileResource extends JsonResource
{
    public function __construct(
        private readonly ContractFileData $contractFile,
    ) {
        parent::__construct($contractFile);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->contractFile->id,
            'body' => $this->contractFile->body,
            'tag' => $this->contractFile->tag,
            'filename' => $this->contractFile->filename,
            'created_at' => $this->contractFile->createdAt?->toIso8601String(),
        ];
    }
}
