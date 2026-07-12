<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Requests\Admin\StoreCompanyMessageRequest;
use App\Http\Resources\Admin\CompanyMessageResource;
use App\Models\CompanyMessage;
use App\Models\CompanyUploadedFile;
use App\Models\User;
use App\Notifications\NewChatMessageReceivedNotification;
use App\Support\SpaUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

/**
 * Staff → customer mailbox messages (old Company\CompanyMessageController):
 * the outbox listing, sending a message with attachments and the (soft)
 * delete. The old destroy never removed the attached files — kept as is.
 */
final class CompanyMessageController
{
    private const int PER_PAGE = 20;

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'customer_number' => ['nullable', 'string'],
            'name' => ['nullable', 'string'],
            'email' => ['nullable', 'string'],
            'user_filter' => ['nullable', 'in:with_user,without_user'],
        ]);

        $query = CompanyMessage::query()
            ->latest()
            ->with(['user', 'uploadedFiles']);

        if ($request->filled('customer_number')) {
            $userId = User::query()
                ->where('customer_number', trim($request->string('customer_number')->value()))
                ->value('id');

            $query->where('customer_user_id', $userId);
        }

        if ($request->filled('name') || $request->filled('email')) {
            $userQuery = User::query()->searchNameEmail(
                $request->filled('name') ? $request->string('name')->value() : null,
                $request->filled('email') ? $request->string('email')->value() : null,
            );

            $query->whereIn('customer_user_id', $userQuery->select('id'));
        }

        $userFilter = $request->string('user_filter')->value();

        if ($userFilter === 'with_user') {
            $query->whereNotNull('customer_user_id');
        } elseif ($userFilter === 'without_user') {
            $query->whereNull('customer_user_id');
        }

        $messages = $query->paginate(self::PER_PAGE);

        /** @var list<CompanyMessage> $items */
        $items = array_values($messages->items());

        return response()->json([
            'data' => array_map(
                static fn (CompanyMessage $message): CompanyMessageResource => new CompanyMessageResource($message),
                $items,
            ),
            'meta' => [
                'current_page' => $messages->currentPage(),
                'last_page' => $messages->lastPage(),
                'total' => $messages->total(),
            ],
        ]);
    }

    public function store(StoreCompanyMessageRequest $request): JsonResponse
    {
        $admin = $request->user();
        abort_unless($admin instanceof User, 401);

        $customer = User::query()->findOrFail($request->integer('customer_user_id'));

        $message = CompanyMessage::create([
            'customer_user_id' => (string) $customer->id,
            'subject' => $request->string('subject')->value(),
            'message' => $request->string('message')->value(),
        ]);

        /** @var array<int, UploadedFile>|UploadedFile|null $files */
        $files = $request->file('files');
        $files = is_array($files) ? $files : array_filter([$files]);

        foreach ($files as $file) {
            $path = $file->store('company-uploads/'.$customer->id);

            if ($path === false) {
                abort(500, 'Datei konnte nicht gespeichert werden.');
            }

            CompanyUploadedFile::create([
                'company_message_id' => $message->id,
                'customer_user_id' => $customer->id,
                'user_id' => $admin->id,
                'name' => $file->getClientOriginalName(),
                'path' => $path,
                'mime_type' => (string) $file->getMimeType(),
                'processed' => false,
            ]);
        }

        // Old app: NewCustomerMessage notification; the link points to the
        // customer's SPA mailbox.
        $customer->notify(new NewChatMessageReceivedNotification(
            SpaUrl::to("/kunde/{$customer->id}/postfach"),
        ));

        $message->load(['user', 'uploadedFiles']);

        return response()->json([
            'data' => new CompanyMessageResource($message),
            'message' => 'Nachricht versandt.',
        ], 201);
    }

    public function destroy(CompanyMessage $companyMessage): JsonResponse
    {
        $companyMessage->delete();

        return response()->json([
            'message' => 'Nachricht erfolgreich gelöscht!',
        ]);
    }
}
