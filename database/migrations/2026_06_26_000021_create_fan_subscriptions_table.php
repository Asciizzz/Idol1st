<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fan_subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('fan_id');
            $table->uuid('tier_id');
            $table->timestamp('start_date')->useCurrent();
            $table->timestamp('end_date')->nullable();
            $table->enum('status', ['ACTIVE', 'EXPIRING', 'EXPIRED', 'CANCELLED'])->default('ACTIVE');
            $table->boolean('auto_renew')->default(true);
            $table->timestamps();

            $table->foreign('fan_id')->references('id')->on('fans')->cascadeOnDelete();
            $table->foreign('tier_id')->references('id')->on('membership_tiers')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fan_subscriptions');
    }
};
