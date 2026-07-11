<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\AccountSetupNotification;
use App\Notifications\ContractAssignedNotification;
use App\Notifications\EmailChangedNotification;
use App\Notifications\PasswordChangedNotification;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;
use Throwable;

final class TestMails extends Command
{
    protected $signature = 'app:test-mails {email : Ziel-E-Mail-Adresse für alle Test-Mails}';

    protected $description = 'Schickt alle im System verwendeten Mails testweise an die angegebene Adresse (z. B. für einen Mailpit-Check).';

    public function handle(): int
    {
        $email = $this->argument('email');

        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $this->error('Bitte eine gültige E-Mail-Adresse angeben.');

            return self::FAILURE;
        }

        $user = new User([
            'name' => 'Test Empfänger',
            'email' => $email,
        ]);
        $user->forceFill(['id' => 1]);

        $mails = [
            'AccountSetup' => static fn () => $user->notifyNow(new AccountSetupNotification),
            'VerifyEmail' => static fn () => $user->notifyNow(new VerifyEmailNotification),
            'ResetPassword' => static fn () => $user->notifyNow(new ResetPasswordNotification('fake-reset-token')),
            'PasswordChanged' => static fn () => Notification::route('mail', $email)->notifyNow(new PasswordChangedNotification),
            'EmailChanged' => static fn () => Notification::route('mail', $email)->notifyNow(new EmailChangedNotification('neu@beispiel.de')),
            'ContractAssigned' => static fn () => Notification::route('mail', $email)->notifyNow(new ContractAssignedNotification(123456, 'Max Mustermann')),
        ];

        $failed = false;

        foreach ($mails as $name => $send) {
            $this->output->write("  Sende <info>{$name}</info> ... ");

            try {
                $send();
                $this->line('<info>OK</info>');
            } catch (Throwable $e) {
                $failed = true;
                $this->line('<error>Fehler: '.$e->getMessage().'</error>');
            }
        }

        $this->newLine();
        $this->info("Fertig. Alle Mails wurden an {$email} geschickt.");

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
