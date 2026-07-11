<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

final class MakeAdmin extends Command
{
    protected $signature = 'app:make-admin
        {name? : Name des Admin-Benutzers}
        {email? : E-Mail-Adresse des Admin-Benutzers}
        {--password : Passwort interaktiv setzen (sonst wird der Benutzer ohne Passwort angelegt)}';

    protected $description = 'Neuen Admin-Benutzer erstellen.';

    public function handle(): int
    {
        $name = $this->stringArgument('name', 'Dein Name:');
        $email = $this->stringArgument('email', 'Deine E-Mail-Adresse:');

        if ($name === '' || $email === '') {
            $this->error('Name und E-Mail-Adresse sind erforderlich.');

            return self::FAILURE;
        }

        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $this->error('Die E-Mail-Adresse ist ungültig.');

            return self::FAILURE;
        }

        if (User::query()->where('email', $email)->exists()) {
            $this->error('Es existiert bereits ein Benutzer mit dieser E-Mail-Adresse.');

            return self::FAILURE;
        }

        $password = null;

        if ($this->option('password') === true) {
            $secret = $this->secret('Passwort:');
            $password = is_string($secret) ? $secret : '';

            if ($password === '') {
                $this->error('Es wurde kein Passwort eingegeben.');

                return self::FAILURE;
            }
        }

        $user = new User([
            'customer_number' => null,
            'name' => $name,
            'email' => $email,
            'password' => $password === null ? null : Hash::make($password),
            'admin' => true,
        ]);
        $user->email_verified_at = now();
        $user->save();

        $this->info("Admin-Benutzer {$name} <{$email}> wurde angelegt.");

        return self::SUCCESS;
    }

    private function stringArgument(string $key, string $question): string
    {
        $value = $this->argument($key);

        if (! is_string($value) || $value === '') {
            $value = $this->ask($question);
        }

        return is_string($value) ? trim($value) : '';
    }
}
