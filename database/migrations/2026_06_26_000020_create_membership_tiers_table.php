<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('membership_tiers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->decimal('price', 10, 2)->default(0);
            $table->enum('billing_cycle', ['MONTHLY', 'YEARLY', 'LIFETIME']);
            $table->unsignedInteger('max_members')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::create('tier_perks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tier_id');
            $table->string('description');
            $table->enum('perk_type', ['EXCLUSIVE_CONTENT', 'EARLY_ACCESS', 'MERCH_DISCOUNT', 'LIVE_ACCESS', 'BADGE']);
            $table->timestamps();

            $table->foreign('tier_id')->references('id')->on('membership_tiers')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tier_perks');
        Schema::dropIfExists('membership_tiers');
    }
};
