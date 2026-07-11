<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Models\User;
use App\Models\UserMailLog;
use Illuminate\Mail\Events\MessageSent;
use Symfony\Component\Mime\Email;

/**
 * Persists an audit entry for every outgoing mail. The mail category is
 * carried by the explicit X-Mail-Type header each notification sets
 * (values of App\Enums\MailLogType); mails to administrators are skipped.
 */
final class LogUserMail
{
    public function handle(MessageSent $event): void
    {
        $message = $event->sent->getOriginalMessage();

        if (! $message instanceof Email) {
            return;
        }

        $subject = $message->getSubject() ?? '';
        $type = $message->getHeaders()->getHeaderBody('X-Mail-Type');

        foreach ($message->getTo() as $address) {
            $email = $address->getAddress();

            $user = User::query()->where('email', $email)->first();

            if ($user !== null && $user->isAdministrator()) {
                continue;
            }

            UserMailLog::query()->create([
                'user_id' => $user?->id,
                'email' => $email,
                'type' => is_string($type) ? $type : null,
                'subject' => $subject,
            ]);
        }
    }
}
