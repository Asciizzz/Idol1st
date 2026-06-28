<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('addresses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('fan_id');
            $table->string('street');
            $table->string('city');
            $table->string('state')->nullable();
            $table->string('country');
            $table->string('postal_code')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->foreign('fan_id')->references('id')->on('fans')->cascadeOnDelete();
        });

        Schema::create('merch_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('fan_id');
            $table->uuid('tenant_id');
            $table->uuid('shipping_address_id')->nullable(); // snapshot reference
            $table->string('shipping_street');               // address snapshot
            $table->string('shipping_city');
            $table->string('shipping_state')->nullable();
            $table->string('shipping_country');
            $table->string('shipping_postal_code')->nullable();
            $table->decimal('total_amount', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->enum('status', ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'])->default('PENDING');
            $table->timestamp('placed_at')->useCurrent();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->foreign('fan_id')->references('id')->on('fans')->cascadeOnDelete();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::create('merch_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->string('product_name');  // snapshot — not a FK
            $table->string('sku');           // snapshot
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('subtotal', 10, 2);
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('merch_orders')->cascadeOnDelete();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id')->nullable();
            $table->uuid('subscription_id')->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->enum('status', ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'])->default('PENDING');
            $table->enum('method', ['CREDIT_CARD', 'PAYPAL', 'STRIPE', 'BANK_TRANSFER']);
            $table->string('transaction_id')->nullable();
            $table->string('transfer_network')->nullable(); // PROMPTPAY, DUITNOW, etc.
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('merch_orders')->nullOnDelete();
            $table->foreign('subscription_id')->references('id')->on('fan_subscriptions')->nullOnDelete();
        });

        Schema::create('shipments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->string('tracking_number')->nullable();
            $table->string('carrier')->nullable();
            $table->enum('status', ['PREPARING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED'])->default('PREPARING');
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('estimated_delivery')->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('merch_orders')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipments');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('merch_order_items');
        Schema::dropIfExists('merch_orders');
        Schema::dropIfExists('addresses');
    }
};
