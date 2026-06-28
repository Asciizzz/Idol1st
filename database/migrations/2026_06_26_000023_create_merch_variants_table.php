<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('merch_variants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('product_id');
            $table->string('sku')->unique();
            $table->json('attributes');             // e.g. {"size": "M", "color": "black"}
            $table->decimal('price', 10, 2);
            $table->unsignedInteger('stock_qty')->default(0);
            $table->unsignedInteger('available_qty')->default(0); // decremented on checkout
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('merch_products')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merch_variants');
    }
};
