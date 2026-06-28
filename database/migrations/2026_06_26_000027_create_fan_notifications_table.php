<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fan_notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('fan_id');
            $table->enum('type', [
                'NEW_POST',
                'NEW_MERCH',
                'EVENT_REMINDER',
                'SUBSCRIPTION_EXPIRY',
                'NEW_MEDIA',
                'COMEBACK_ALERT',
            ]);
            $table->string('message');
            $table->boolean('is_read')->default(false);
            $table->uuid('reference_id')->nullable();   // e.g. blog post UUID
            $table->string('reference_type')->nullable(); // e.g. 'BlogPost'
            $table->timestamp('created_at')->useCurrent();

            $table->index(['fan_id', 'is_read']);
            $table->foreign('fan_id')->references('id')->on('fans')->cascadeOnDelete();
        });

        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->uuid('fan_id');
            $table->string('type');
            $table->boolean('is_enabled')->default(true);
            $table->enum('channel', ['EMAIL', 'PUSH', 'IN_APP'])->default('IN_APP');
            $table->timestamps();

            // One preference per fan per type per channel
            $table->unique(['fan_id', 'type', 'channel']);
            $table->foreign('fan_id')->references('id')->on('fans')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
        Schema::dropIfExists('fan_notifications');
    }
};
