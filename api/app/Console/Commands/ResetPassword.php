<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Password;

final class ResetPassword extends Command
{
    protected $signature = 'app:reset-password {email : E-Mail-Adresse des Benutzers}';

    protected $description = 'Schickt dem Benutzer einen Passwort-zurück-setzen-Link.';

    public function handle(): int
    {
        $email = $this->argument('email');

        if (User::query()->where('email', $email)->doesntExist()) {
            $this->error('Es wurde kein Benutzer mit dieser E-Mail-Adresse gefunden.');

            return self::FAILURE;
        }

        $status = Password::sendResetLink(['email' => $email]);

        if ($status !== Password::RESET_LINK_SENT) {
            $message = __($status);
            $this->error(is_string($message) ? $message : $status);

            return self::FAILURE;
        }

        $this->info("Passwort-zurück-setzen-Link wurde an {$email} geschickt.");

        return self::SUCCESS;
    }
}
