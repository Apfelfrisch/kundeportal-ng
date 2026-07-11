<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Machine readable mail categories, written into the X-Mail-Type header of
 * every outgoing notification and persisted by the LogUserMail listener.
 */
enum MailLogType: string
{
    case AccountSetup = 'account_setup';
    case ContractAssigned = 'contract_assigned';
    case PasswordReset = 'password_reset';
    case PasswordChanged = 'password_changed';
    case EmailChanged = 'email_changed';
    case EmailVerification = 'email_verification';
    case ChangeData = 'change_data';
    case ChatMessage = 'chat_message';
}
