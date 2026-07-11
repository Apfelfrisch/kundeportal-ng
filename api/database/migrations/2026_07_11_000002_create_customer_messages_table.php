<?php

declare(strict_types=1);

use App\Enums\CustomerMessageStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Column shapes stay compatible with the old application so existing
        // rows can be migrated 1:1.
        Schema::create('customer_messages', function (Blueprint $table) {
            $table->id();
            $table->string('form_type');
            $table->string('customer_user_id')->nullable();
            $table->string('customer_message_id')->nullable();
            $table->string('contract_number')->nullable();
            $table->string('user_id');
            $table->json('data');
            $table->boolean('processed')->default(false);
            $table->string('status')->default(CustomerMessageStatus::UnProcessed->value);
            $table->bigInteger('caseworker')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_messages');
    }
};
