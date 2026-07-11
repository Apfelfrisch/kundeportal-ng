<?php

declare(strict_types=1);

namespace App\Services;

use App\Integrations\CustomerDataApi\CustomerDataApiConnector;
use App\Integrations\CustomerDataApi\Data\ContractData;
use App\Integrations\CustomerDataApi\Requests\GetContractRequest;
use App\Integrations\CustomerDataApi\Requests\GetContractsByIdsRequest;
use App\Models\User;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Read access to KVS contracts, replacing the old Customer*Repositories.
 * Access rule ported from the old ConfirmedContractAccessMiddleware: a
 * customer only reaches contracts with a confirmed ContractToUser row,
 * administrators bypass the check.
 */
final readonly class ContractService
{
    public function __construct(
        private CustomerDataApiConnector $connector,
    ) {}

    /**
     * All contracts of the user's confirmed assignments. An empty assignment
     * list never hits the API.
     *
     * @return list<ContractData>
     */
    public function listForUser(User $user): array
    {
        $contractNumbers = $user->contractNumbers();

        if ($contractNumbers === []) {
            return [];
        }

        $request = new GetContractsByIdsRequest($contractNumbers);
        $response = $this->connector->send($request);

        return $request->createDtoFromResponse($response);
    }

    /**
     * A single contract in the context of the customer area.
     *
     * @throws AccessDeniedHttpException when the target customer has no confirmed assignment and the acting user is no administrator
     */
    public function findForUser(User $actingUser, User $customer, int $contractNumber): ContractData
    {
        if (! $actingUser->isAdministrator() && ! $this->hasConfirmedAssignment($customer, $contractNumber)) {
            throw new AccessDeniedHttpException('Sie haben keinen Zugriff auf diesen Vertrag.');
        }

        return $this->find($contractNumber);
    }

    /**
     * A single contract without local access checks (admin area).
     */
    public function find(int $contractNumber): ContractData
    {
        $request = new GetContractRequest($contractNumber);
        $response = $this->connector->send($request);

        return $request->createDtoFromResponse($response);
    }

    private function hasConfirmedAssignment(User $customer, int $contractNumber): bool
    {
        // The ConfirmedScope on ContractToUser limits this to confirmed rows.
        return $customer->contractAssignments()
            ->where('contract_number', $contractNumber)
            ->exists();
    }
}
