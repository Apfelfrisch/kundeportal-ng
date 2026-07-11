<?php

declare(strict_types=1);

namespace App\Services;

use App\Integrations\CustomerDataApi\Exceptions\ContractNotFoundException;
use App\Models\CompanyMessage;
use App\Models\CompanyUploadedFile;
use App\Models\ContractToUser;
use App\Models\CustomerMessage;
use App\Models\CustomerUploadedFile;
use App\Models\User;
use App\Models\UserMailLog;
use App\Notifications\AccountSetupNotification;
use App\Notifications\ContractAssignedNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Staff-side user and contract-assignment management, ported from the old
 * CustomerUserController / Company\ContractController.
 *
 * Auto-confirm rule: when the email address stored on the KVS contract
 * matches the portal user's address the assignment is confirmed right away;
 * otherwise the contract owner gets a signed confirmation mail.
 */
final readonly class ContractAssignmentService
{
    public function __construct(
        private ContractService $contracts,
    ) {}

    /**
     * Create a passwordless customer user, optionally assign a contract and
     * optionally invite them via the account-setup mail.
     */
    public function createCustomerUser(string $name, string $email, ?int $contractNumber, bool $sendSetupMail): User
    {
        $user = DB::transaction(function () use ($name, $email, $contractNumber): User {
            $user = new User([
                'name' => $name,
                'email' => $email,
                'password' => null,
            ]);
            $user->setRememberToken(Str::random(10));
            $user->save();

            if ($contractNumber !== null) {
                // The old store() never checked for an existing assignment,
                // so the auto-confirm-or-mail step runs unconditionally.
                $this->createAssignment($user, $contractNumber);
            }

            return $user;
        });

        if ($sendSetupMail) {
            $user->notify(new AccountSetupNotification);
        }

        return $user;
    }

    /**
     * Assign a contract to an existing user.
     *
     * @throws ValidationException when the contract is already assigned (confirmed or not)
     */
    public function assign(User $user, int $contractNumber): ContractToUser
    {
        $alreadyAssigned = ContractToUser::withUnconfirmed()
            ->where('contract_number', $contractNumber)
            ->exists();

        if ($alreadyAssigned) {
            throw ValidationException::withMessages([
                'contract_number' => "Der Vertrag {$contractNumber} ist bereits einem Benutzer zugewiesen.",
            ]);
        }

        return $this->createAssignment($user, $contractNumber);
    }

    /**
     * Re-send the confirmation mail for a still unconfirmed assignment.
     */
    public function resendConfirmation(int $contractNumber): void
    {
        $assignment = ContractToUser::withUnconfirmed()
            ->where('contract_number', $contractNumber)
            ->where('confirmed', false)
            ->first();

        if ($assignment === null) {
            abort(404, 'Zu diesem Vertrag liegt keine unbestätigte Zuweisung vor.');
        }

        $user = User::query()->findOrFail($assignment->user_id);
        $contractEmail = $this->contractEmail($assignment->contract_number);

        if ($contractEmail === null) {
            throw ValidationException::withMessages([
                'contract_number' => 'Keine E-Mail-Adresse im Vertrag hinterlegt.',
            ]);
        }

        Notification::route('mail', $contractEmail)
            ->notify(new ContractAssignedNotification($assignment->contract_number, $user->name));
    }

    /**
     * Remove an assignment (confirmed or not) and return its contract number.
     */
    public function removeAssignment(int $contractToUserId): int
    {
        $assignment = ContractToUser::withUnconfirmed()->find($contractToUserId);

        if ($assignment === null) {
            abort(404, 'Diese Zuweisung existiert nicht.');
        }

        $contractNumber = $assignment->contract_number;
        $assignment->delete();

        return $contractNumber;
    }

    /**
     * Delete a user with the exact cascade of the old destroy(): mailbox
     * messages and files (soft deleted), mail logs (soft deleted) and the
     * contract assignments (hard deleted) go with the account.
     */
    public function deleteUser(User $user): void
    {
        DB::transaction(function () use ($user): void {
            CompanyUploadedFile::query()->where('customer_user_id', $user->id)->delete();
            CompanyMessage::query()->where('customer_user_id', $user->id)->delete();
            CustomerMessage::query()->where('customer_user_id', $user->id)->delete();
            CustomerUploadedFile::query()->where('customer_user_id', $user->id)->delete();
            UserMailLog::query()->where('user_id', $user->id)->delete();
            ContractToUser::withUnconfirmed()->where('user_id', $user->id)->delete();

            $user->delete();
        });
    }

    /**
     * Users with a password get a reset link, users without one the signed
     * account-setup invitation.
     *
     * @return bool true when a password reset mail went out, false for the setup mail
     */
    public function sendSetupMail(User $user): bool
    {
        if ($user->hasPassword()) {
            $status = Password::sendResetLink(['email' => $user->email]);

            if ($status !== Password::RESET_LINK_SENT) {
                $message = __($status);

                throw ValidationException::withMessages([
                    'email' => [is_string($message) ? $message : 'Passwort-Reset-Mail konnte nicht gesendet werden.'],
                ]);
            }

            return true;
        }

        $user->notify(new AccountSetupNotification);

        return false;
    }

    private function createAssignment(User $user, int $contractNumber): ContractToUser
    {
        $contractEmail = $this->contractEmail($contractNumber);
        $emailsMatch = $contractEmail !== null && strtolower($contractEmail) === strtolower($user->email);

        $assignment = ContractToUser::create([
            'user_id' => $user->id,
            'contract_number' => $contractNumber,
            'confirmed' => $emailsMatch,
        ]);

        if (! $emailsMatch && $contractEmail !== null) {
            Notification::route('mail', $contractEmail)
                ->notify(new ContractAssignedNotification($contractNumber, $user->name));
        }

        return $assignment;
    }

    /**
     * Email address stored on the KVS contract. A missing contract behaves
     * like the old raw HTTP call: null, which leaves the assignment
     * unconfirmed and sends no mail.
     */
    private function contractEmail(int $contractNumber): ?string
    {
        try {
            return $this->contracts->find($contractNumber)->mail;
        } catch (ContractNotFoundException) {
            return null;
        }
    }
}
