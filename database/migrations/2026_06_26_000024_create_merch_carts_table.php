<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('merch_carts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('fan_id');
            $table->uuid('tenant_id');
            $table->timestamps();

            $table->unique(['fan_id', 'tenant_id']); // one cart per fan per tenant
            $table->foreign('fan_id')->references('id')->on('fans')->cascadeOnDelete();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::create('merch_cart_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('cart_id');
            $table->uuid('product_id');
            $table->uuid('variant_id');
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 10, 2); // price at time of adding to cart
            $table->timestamps();

            $table->foreign('cart_id')->references('id')->on('merch_carts')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('merch_products')->cascadeOnDelete();
            $table->foreign('variant_id')->references('id')->on('merch_variants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merch_cart_items');
        Schema::dropIfExists('merch_carts');
    }
};
