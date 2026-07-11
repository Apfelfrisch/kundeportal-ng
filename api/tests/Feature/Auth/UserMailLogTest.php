<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Models\UserMailLog;
use App\Notifications\AccountSetupNotification;
use App\Notifications\EmailChangedNotification;
use App\Notifications\PasswordChangedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Sends real mails through the array transport so MessageSent fires and
 * the LogUserMail listener records the X-Mail-Type header.
 */
final class UserMailLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_sent_mails_are_logged_with_their_mail_type(): void
    {
        $user = User::factory()->withoutPassword()->create();

        $user->notify(new AccountSetupNotification);

        $log = UserMailLog::query()->sole();

        $this->assertSame($user->id, $log->user_id);
        $this->assertSame($user->email, $log->email);
        $this->assertSame('account_setup', $log->type);
        $this->assertSame('Account einrichten | Voltaik Strom Kundenportal', $log->subject);
    }

    public function test_mails_to_unknown_recipients_are_logged_without_user(): void
    {
        Notification::route('mail', 'vertragsinhaber@example.com')
            ->notifyNow(new EmailChangedNotification('neu@example.com'));

        $log = UserMailLog::query()->sole();

        $this->assertNull($log->user_id);
        $this->assertSame('vertragsinhaber@example.com', $log->email);
        $this->assertSame('email_changed', $log->type);
    }

    public function test_mails_to_administrators_are_not_logged(): void
    {
        $admin = User::factory()->admin()->create();

        $admin->notify(new PasswordChangedNotification);

        $this->assertSame(0, UserMailLog::query()->count());
    }
}
