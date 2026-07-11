<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CompanyUploadedFile;
use App\Models\CustomerUploadedFile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class MailboxFileResource extends JsonResource
{
    public function __construct(
        private readonly CompanyUploadedFile|CustomerUploadedFile $file,
    ) {
        parent::__construct($file);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->file->id,
            'name' => $this->file->name,
            'mime_type' => $this->file->mime_type,
        ];
    }
}
