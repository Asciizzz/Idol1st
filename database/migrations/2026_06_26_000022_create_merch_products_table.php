<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('merch_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::create('merch_products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('category_id')->nullable();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('base_price', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('cover_image_url')->nullable();
            $table->json('images')->nullable();
            $table->enum('status', ['ACTIVE', 'INACTIVE', 'SOLD_OUT'])->default('ACTIVE');
            $table->boolean('is_limited_edition')->default(false);
            $table->timestamp('available_from')->nullable();
            $table->timestamp('available_until')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('category_id')->references('id')->on('merch_categories')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merch_products');
        Schema::dropIfExists('merch_categories');
    }
};
