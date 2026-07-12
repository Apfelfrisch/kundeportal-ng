<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ChangeRequestType;
use App\Enums\CustomerMessageStatus;
use App\Models\CompanyMessage;
use App\Models\CompanyUploadedFile;
use App\Models\CustomerMessage;
use App\Models\CustomerUploadedFile;
use App\Models\User;
use App\Notifications\CustomerChatMessageReceivedNotification;
use App\Support\TenantConfig;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * The customer mailbox ("Postfach"), ported from the old Mailbox controllers:
 * one merged chronological thread of ALL CustomerMessages (change requests
 * appear as tickets, chat messages carry a `message` key) and all
 * CompanyMessages of the customer. Files live on the local disk.
 */
final readonly class MailboxService
{
    private const string DISK = 'local';

    private const string FILE_NOT_FOUND_MESSAGE = 'Die Datei wurde nicht gefunden.';

    private const string FILE_FORBIDDEN_MESSAGE = 'Sie haben keinen Zugriff auf diese Datei.';

    public function __construct(
        private TenantConfig $tenant,
    ) {}

    /**
     * Old CustomerMailboxChatController::index(): mark unread company
     * messages as read, then merge both message types newest first.
     *
     * @return Collection<int, CompanyMessage|CustomerMessage>
     */
    public function thread(User $customer): Collection
    {
        CompanyMessage::query()
            ->where('customer_user_id', (string) $customer->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $companyMessages = CompanyMessage::query()
            ->with('uploadedFiles')
            ->where('customer_user_id', (string) $customer->id)
            ->get();

        $customerMessages = CustomerMessage::query()
            ->with('uploadedFiles')
            ->where('customer_user_id', (string) $customer->id)
            ->get();

        /** @var Collection<int, CompanyMessage|CustomerMessage> $merged */
        $merged = new Collection([...$companyMessages->all(), ...$customerMessages->all()]);

        return $merged
            ->sortByDesc(static fn (CompanyMessage|CustomerMessage $message): int => $message->created_at?->getTimestamp() ?? 0)
            ->values();
    }

    /**
     * Old CustomerMailboxChatController::store(): a chat message is a
     * CustomerMessage with form_type `contact`; uploads are stored on the
     * local disk under customer-uploads/{customer}. The company contact
     * address is notified about the new chat message.
     *
     * @param  list<UploadedFile>  $files
     */
    public function storeMessage(User $actingUser, User $customer, ?string $messageText, array $files): CustomerMessage
    {
        $customerMessage = CustomerMessage::create([
            'form_type' => ChangeRequestType::CONTACT->value,
            'customer_user_id' => (string) $customer->id,
            'user_id' => (string) $actingUser->id,
            'data' => ['message' => $messageText],
            'status' => CustomerMessageStatus::UnProcessed,
        ]);

        foreach ($files as $file) {
            $path = $file->store('customer-uploads/'.$customer->id, self::DISK);

            if (! is_string($path)) {
                throw new RuntimeException('Die Datei konnte nicht gespeichert werden.');
            }

            CustomerUploadedFile::create([
                'customer_message_id' => $customerMessage->id,
                'user_id' => $actingUser->id,
                'customer_user_id' => $customer->id,
                'name' => $file->getClientOriginalName(),
                'path' => $path,
                'mime_type' => (string) $file->getMimeType(),
                'processed' => false,
            ]);
        }

        Notification::route('mail', $this->tenant->contactEmail())
            ->notify(new CustomerChatMessageReceivedNotification($customer, $messageText ?? ''));

        return $customerMessage;
    }

    /**
     * @throws NotFoundHttpException when no such file exists
     * @throws AccessDeniedHttpException when the file belongs to another customer
     */
    public function findCustomerFile(User $customer, int $fileId): CustomerUploadedFile
    {
        $file = CustomerUploadedFile::query()->find($fileId);

        $this->assertOwnedFile($file, $customer);

        return $file;
    }

    /**
     * @throws NotFoundHttpException when no such file exists
     * @throws AccessDeniedHttpException when the file belongs to another customer
     */
    public function findCompanyFile(User $customer, int $fileId): CompanyUploadedFile
    {
        $file = CompanyUploadedFile::query()->find($fileId);

        $this->assertOwnedFile($file, $customer);

        return $file;
    }

    /**
     * @phpstan-assert !null $file
     *
     * @throws NotFoundHttpException when no such file exists
     * @throws AccessDeniedHttpException when the file belongs to another customer
     */
    private function assertOwnedFile(CompanyUploadedFile|CustomerUploadedFile|null $file, User $customer): void
    {
        if ($file === null) {
            throw new NotFoundHttpException(self::FILE_NOT_FOUND_MESSAGE);
        }

        if ($file->customer_user_id !== $customer->id) {
            throw new AccessDeniedHttpException(self::FILE_FORBIDDEN_MESSAGE);
        }
    }

    /**
     * @return resource
     *
     * @throws NotFoundHttpException when the blob is missing on the disk
     */
    public function readStream(string $path)
    {
        if (! Storage::disk(self::DISK)->exists($path)) {
            throw new NotFoundHttpException(self::FILE_NOT_FOUND_MESSAGE);
        }

        $stream = Storage::disk(self::DISK)->readStream($path);

        if (! is_resource($stream)) {
            throw new NotFoundHttpException(self::FILE_NOT_FOUND_MESSAGE);
        }

        return $stream;
    }
}
