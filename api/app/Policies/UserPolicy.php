<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

final class UserPolicy
{
    /**
     * Whether the authenticated user may act for the target customer —
     * either themselves or an administrator (old CustomerMiddleware
     * semantics).
     */
    public function actFor(User $authUser, User $user): Response
    {
        if ($authUser->is($user) || $authUser->isAdministrator()) {
            return Response::allow();
        }

        return Response::deny('Sie dürfen nicht für diesen Benutzer handeln.');
    }
}
