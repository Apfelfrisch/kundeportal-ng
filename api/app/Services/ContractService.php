<?php

declare(strict_types=1);

namespace App\Services;

use App\Integrations\CustomerDataApi\CustomerDataApiConnector;
use App\Integrations\CustomerDataApi\Data\ContractData;
use App\Integrations\CustomerDataApi\Data\ContractPageData;
use App\Integrations\CustomerDataApi\Exceptions\ContractNotFoundException;
use App\Integrations\CustomerDataApi\Requests\GetContractRequest;
use App\Integrations\CustomerDataApi\Requests\GetContractsByIdsRequest;
use App\Integrations\CustomerDataApi\Requests\GetContractsRequest;
use App\Models\ContractToUser;
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
    /**
     * The old AdminContractsRepository fetched every matched contract with a
     * separate request; the batch call keeps a hard cap instead.
     */
    private const int ADMIN_SEARCH_CONTRACT_LIMIT = 25;

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

    /**
     * One page of the full KVS contract listing (admin area).
     */
    public function page(int $page = 1): ContractPageData
    {
        $request = new GetContractsRequest($page);
        $response = $this->connector->send($request);

        return $request->createDtoFromResponse($response);
    }

    /**
     * Admin contract listing, port of the old AdminContractsRepository: a
     * contract number outranks the local name/email search, which outranks
     * the plain page passthrough.
     */
    public function searchAdmin(
        ?int $contractNumber = null,
        ?string $name = null,
        ?string $email = null,
        int $page = 1,
    ): ContractPageData {
        if ($contractNumber !== null) {
            return $this->adminPageFromContractNumber($contractNumber);
        }

        if ($name !== null || $email !== null) {
            return $this->adminPageFromLocalUserSearch($name, $email);
        }

        return $this->page($page);
    }

    private function adminPageFromContractNumber(int $contractNumber): ContractPageData
    {
        try {
            $contract = $this->find($contractNumber);
        } catch (ContractNotFoundException) {
            // Old behaviour: an unknown number yields an empty listing, no error.
            return self::adminSearchPage([]);
        }

        return self::adminSearchPage([$contract]);
    }

    /**
     * Local users matching name/email → their contract numbers (including
     * unconfirmed assignments!) → one KVS batch call. The old repository
     * fired N single-contract requests here instead.
     */
    private function adminPageFromLocalUserSearch(?string $name, ?string $email): ContractPageData
    {
        $userQuery = User::query();

        if ($name !== null) {
            $userQuery->where('name', 'like', "%{$name}%");
        }

        if ($email !== null) {
            $userQuery->where('email', 'like', "%{$email}%");
        }

        $contractNumbers = [];

        $matchedAssignments = ContractToUser::withUnconfirmed()
            ->whereIn('user_id', $userQuery->select('id'))
            ->orderBy('id')
            ->get();

        foreach ($matchedAssignments as $assignment) {
            $contractNumbers[] = $assignment->contract_number;
        }

        $contractNumbers = array_slice(
            array_values(array_unique($contractNumbers)),
            0,
            self::ADMIN_SEARCH_CONTRACT_LIMIT,
        );

        if ($contractNumbers === []) {
            return self::adminSearchPage([]);
        }

        try {
            $request = new GetContractsByIdsRequest($contractNumbers);
            $response = $this->connector->send($request);

            return self::adminSearchPage($request->createDtoFromResponse($response));
        } catch (ContractNotFoundException) {
            // Old behaviour: missing contracts silently drop out of the listing.
            return self::adminSearchPage([]);
        }
    }

    /**
     * Search results are never paginated (old repository semantics).
     *
     * @param  list<ContractData>  $contracts
     */
    private static function adminSearchPage(array $contracts): ContractPageData
    {
        return new ContractPageData(
            items: $contracts,
            currentPage: 1,
            lastPage: 1,
            total: count($contracts),
        );
    }

    private function hasConfirmedAssignment(User $customer, int $contractNumber): bool
    {
        // The ConfirmedScope on ContractToUser limits this to confirmed rows.
        return $customer->contractAssignments()
            ->where('contract_number', $contractNumber)
            ->exists();
    }
}
