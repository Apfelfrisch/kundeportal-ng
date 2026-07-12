<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ChangeRequestType;
use App\Enums\CustomerMessageStatus;
use App\Integrations\CustomerDataApi\Data\ContractData;
use App\Models\CustomerMessage;
use App\Models\User;
use App\Notifications\ChangeDataSubmittedNotification;
use App\Rules\ValidIban;
use App\Support\SpaUrl;
use App\Support\TenantConfig;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Validator as ValidatorInstance;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Ports the old Domain/ChangeData classes plus their per-type FormRequests:
 * every change request becomes a CustomerMessage ticket whose `data` payload
 * contains EXACTLY the old flexAttributes keys of the form type — nothing is
 * written back to the KVS. The company contact address is notified.
 */
final readonly class ChangeRequestService
{
    private const string NOTHING_FILLED_MESSAGE = 'Ihre Nachricht wurde nicht gespeichert, es wurden keine Felder ausgefüllt.';

    private const string HONEYPOT_FIELD = 'bot-check';

    public function __construct(
        private TenantConfig $tenant,
    ) {}

    /**
     * The old flexAttributes lists, ported 1:1 per Domain/ChangeData class.
     *
     * @return list<string>
     */
    public function flexAttributes(ChangeRequestType $type): array
    {
        return match ($type) {
            ChangeRequestType::BANK => ['bank', 'bank_account_owner', 'iban', 'sepa', 'change_all_contracts'],
            ChangeRequestType::BILLING_ADDRESS => ['zip', 'city', 'street', 'street_number', 'address_additive', 'change_all_contracts'],
            ChangeRequestType::DELIVERY_ADDRESS => ['street', 'street_number', 'address_additive', 'zip', 'city', 'date', 'meter_number', 'malo'],
            ChangeRequestType::CONTACT_DATA => ['phone', 'mail', 'mobile', 'send_emails', 'change_all_contracts'],
            ChangeRequestType::INSTALLMENT => ['installment', 'effective_from'],
            ChangeRequestType::METER_COUNT => ['meter_count', 'meter_count_ht', 'meter_count_nt', 'read_on'],
            ChangeRequestType::TERMINATION => ['reason_of_termination', 'termination_at'],
            ChangeRequestType::REVOCATION => ['reason_of_revocation'],
            ChangeRequestType::CONTACT => ['message'],
        };
    }

    /**
     * German notification labels, ported from the old ChangeData controllers'
     * notifyCompany() calls.
     */
    public function changeTypeLabel(ChangeRequestType $type): string
    {
        return match ($type) {
            ChangeRequestType::BANK => 'Bankverbindung geändert',
            ChangeRequestType::BILLING_ADDRESS => 'Rechnungsadresse geändert',
            ChangeRequestType::DELIVERY_ADDRESS => 'Lieferadresse geändert',
            ChangeRequestType::CONTACT_DATA => 'Kontaktdaten geändert',
            ChangeRequestType::INSTALLMENT => 'Abschlag geändert',
            ChangeRequestType::METER_COUNT => 'Zählerstand eingereicht',
            ChangeRequestType::TERMINATION => 'Kündigung eingereicht',
            ChangeRequestType::REVOCATION => 'Widerruf eingereicht',
            ChangeRequestType::CONTACT => throw new NotFoundHttpException,
        };
    }

    /**
     * Validates the request against the old per-type Store*Request rules.
     * The termination minimum date check (old TerminationController::store)
     * runs as an after-hook against the contract's earliest termination date.
     *
     * @throws ValidationException
     */
    public function validate(Request $request, ChangeRequestType $type, ContractData $contract): void
    {
        $validator = Validator::make(
            $request->all(),
            [...$this->rules($type, $contract), self::HONEYPOT_FIELD => ['prohibited']],
            $this->messages(),
        );

        if ($type === ChangeRequestType::TERMINATION) {
            $validator->after(static function (ValidatorInstance $validator) use ($contract, $request): void {
                $minDate = $contract->earliestTerminationDate?->format('Y-m-d');
                $terminationAt = $request->input('termination_at');

                if ($minDate !== null && is_string($terminationAt) && $terminationAt < $minDate) {
                    $validator->errors()->add(
                        'termination_at',
                        "Das Kündigungsdatum darf nicht vor dem {$minDate} liegen.",
                    );
                }
            });
        }

        $validator->validate();
    }

    /**
     * Persists the ticket and notifies the company contact address, porting
     * the old ChangeData::save() + ChangeDataController::notifyCompany().
     */
    public function store(User $actingUser, User $customer, ContractData $contract, ChangeRequestType $type, Request $request): CustomerMessage
    {
        $data = $this->flexData($request, $type, $contract);

        $this->ensureAnythingFilled($data);

        $message = CustomerMessage::create([
            'form_type' => $type->value,
            'customer_user_id' => (string) $customer->id,
            'contract_number' => (string) $contract->contractNumber,
            'user_id' => (string) $actingUser->id,
            'data' => $data,
            'status' => CustomerMessageStatus::UnProcessed,
        ]);

        Notification::route('mail', $this->tenant->contactEmail())
            ->notify(new ChangeDataSubmittedNotification(
                $customer,
                $contract->contractNumber,
                $this->changeTypeLabel($type),
            ));

        return $message;
    }

    /**
     * German success info shown after every change request, ported from the
     * old ChangeDataController::infoText(). The chat link now points to the
     * SPA mailbox route.
     */
    public function infoText(User $customer): string
    {
        $goTo = SpaUrl::to("/kunde/{$customer->id}/postfach");

        return '<h2>Deine Änderungen wurden übermittelt – Danke!</h2>'
            .'<p>Wir prüfen deine Angaben und melden uns nur bei Rückfragen bei dir.</p>'
            .'<p>Sobald alles passt, übernehmen wir die Änderungen für dich – das kann 1–2 Werktage dauern.</p>'
            .'<p>Hinweis: Die aktualisierten Daten erscheinen erst nach der Prüfung hier im System.</p>'
            ."<p>Alle Änderungsmeldungen findest du jederzeit im <a href='{$goTo}'>Kundenchat</a>.</p>";
    }

    /**
     * The old per-type Store*Request rules. Delivery address reused the
     * billing address request in the old application.
     *
     * @return array<string, list<mixed>>
     */
    private function rules(ChangeRequestType $type, ContractData $contract): array
    {
        return match ($type) {
            ChangeRequestType::BANK => [
                'bank' => ['required'],
                'bank_account_owner' => ['required'],
                'iban' => ['required', new ValidIban],
            ],
            ChangeRequestType::BILLING_ADDRESS,
            ChangeRequestType::DELIVERY_ADDRESS => [
                'zip' => ['required', 'string', 'size:5'],
                'street' => ['required'],
                'street_number' => ['required'],
                'city' => ['required'],
            ],
            ChangeRequestType::CONTACT_DATA => [
                'mail' => ['nullable', 'email:rfc,dns'],
                'send_emails' => ['nullable', 'boolean'],
            ],
            ChangeRequestType::INSTALLMENT => $this->installmentRules($contract),
            ChangeRequestType::METER_COUNT => [
                'meter_count' => ['required_without_all:meter_count_ht,meter_count_nt', 'nullable', 'integer'],
                'meter_count_ht' => ['required_without:meter_count', 'nullable', 'integer'],
                'meter_count_nt' => ['required_without:meter_count', 'nullable', 'integer'],
                'read_on' => ['required'],
            ],
            ChangeRequestType::TERMINATION => [
                'termination_at' => ['required', 'date'],
            ],
            ChangeRequestType::REVOCATION => [
                'reason_of_revocation' => ['nullable', 'string'],
            ],
            ChangeRequestType::CONTACT => throw new NotFoundHttpException,
        };
    }

    /**
     * Old StoreInstallmentRequest: the new installment must stay within the
     * configured share of the current payment plan amount.
     *
     * @return array<string, list<mixed>>
     */
    private function installmentRules(ContractData $contract): array
    {
        $currentAmountCents = $contract->currentPaymentPlan(CarbonImmutable::now())->amount ?? 0.0;
        $currentAmountEuros = $currentAmountCents / 100;

        $minAmount = (int) round($currentAmountEuros * config()->float('customer-portal.installment.range.start'));
        $maxAmount = (int) round($currentAmountEuros * config()->float('customer-portal.installment.range.stop'));

        return [
            'installment' => ['required', 'integer', "min:{$minAmount}", "max:{$maxAmount}"],
            'effective_from' => ['required', 'date', 'after_or_equal:'.CarbonImmutable::now()->format('Y-m-d')],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function messages(): array
    {
        return [
            'zip.size' => 'Bitte genau 5 Zahlen für die Postleitzahl eingeben. Wenn vorhanden auch mit einer 0 am Anfang.',
            self::HONEYPOT_FIELD.'.prohibited' => 'Ihre Anfrage konnte nicht verarbeitet werden.',
        ];
    }

    /**
     * Old ChangeData::getFlexAttributesData(): pick EXACTLY the flexAttributes
     * keys from the raw request input, everything else is dropped. The old
     * ContactData subclass nulled send_emails when it matches the contract.
     *
     * @return array<string, mixed>
     */
    private function flexData(Request $request, ChangeRequestType $type, ContractData $contract): array
    {
        $data = [];

        foreach ($this->flexAttributes($type) as $flexAttribute) {
            $data[$flexAttribute] = $request->input($flexAttribute);
        }

        if ($type === ChangeRequestType::CONTACT_DATA && isset($data['send_emails'])) {
            if ($contract->sendEmails === (bool) $data['send_emails']) {
                $data['send_emails'] = null;
            }
        }

        return $data;
    }

    /**
     * Old ChangeData::anythingFilled() / NothingInFormFilledException.
     *
     * @param  array<string, mixed>  $data
     *
     * @throws ValidationException
     */
    private function ensureAnythingFilled(array $data): void
    {
        foreach ($data as $value) {
            if (! in_array($value, [null, '', false], true)) {
                return;
            }
        }

        throw ValidationException::withMessages(['form' => self::NOTHING_FILLED_MESSAGE]);
    }
}
