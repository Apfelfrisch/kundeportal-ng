<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Http\Requests\Mailbox\StoreMailboxMessageRequest;
use App\Http\Resources\CustomerMessageResource;
use App\Http\Resources\MailboxThreadResource;
use App\Models\User;
use App\Services\MailboxService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * The customer mailbox (Postfach), ported from the old
 * CustomerMailboxChatController.
 */
final class MailboxController
{
    public function __construct(
        private readonly MailboxService $mailboxService,
    ) {}

    public function index(User $user): AnonymousResourceCollection
    {
        return MailboxThreadResource::collection($this->mailboxService->thread($user));
    }

    public function store(StoreMailboxMessageRequest $request, User $user): JsonResponse
    {
        $actingUser = $request->user();

        abort_unless($actingUser instanceof User, 401);

        $message = $this->mailboxService->storeMessage(
            $actingUser,
            $user,
            $request->messageText(),
            $request->uploadedFiles(),
        );

        return response()->json([
            'data' => new CustomerMessageResource($message),
        ], 201);
    }
}
