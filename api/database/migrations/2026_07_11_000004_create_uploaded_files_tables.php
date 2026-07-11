<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_uploaded_files', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('customer_message_id');
            $table->unsignedInteger('user_id');
            $table->unsignedInteger('customer_user_id');
            $table->string('name');
            $table->string('path');
            $table->string('mime_type');
            $table->boolean('processed')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('company_uploaded_files', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('company_message_id');
            $table->unsignedInteger('customer_user_id');
            $table->unsignedInteger('user_id');
            $table->string('name');
            $table->string('path');
            $table->string('mime_type');
            $table->boolean('processed')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_uploaded_files');
        Schema::dropIfExists('company_uploaded_files');
    }
};
