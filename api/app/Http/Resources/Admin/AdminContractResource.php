<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Integrations\CustomerDataApi\Data\ContractData;
use App\Models\ContractToUser;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Contract row of the admin listing — the fields of the old
 * company/contracts.blade.php table, enriched with the local assignment
 * (including unconfirmed ones, which customers never see).
 */
final class AdminContractResource extends JsonResource
{
    public function __construct(
        private readonly ContractData $contract,
        private readonly ?ContractToUser $assignment,
    ) {
        parent::__construct($contract);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $this->assignment?->user;

        return [
            'contract_number' => $this->contract->contractNumber,
            'billing_contact' => [
                'company' => $this->contract->billingContactCompany,
                'first_name' => $this->contract->billingContactFirstName,
                'last_name' => $this->contract->billingContactLastName,
            ],
            'address' => [
                'zip' => $this->contract->zip,
                'city' => $this->contract->city,
                'street' => $this->contract->street,
                'street_number' => $this->contract->streetNumber,
                'address_additive' => $this->contract->addressAdditive,
            ],
            'assignment' => $this->assignment === null ? null : [
                'id' => $this->assignment->id,
                'user_id' => $this->assignment->user_id,
                'confirmed' => $this->assignment->confirmed,
                'user' => $user === null ? null : [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
            ],
        ];
    }
}
