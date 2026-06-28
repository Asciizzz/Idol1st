<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feature_flags', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->boolean('is_globally_enabled')->default(false);
            $table->timestamps();
        });

        Schema::create('feature_flag_tenant', function (Blueprint $table) {
            $table->uuid('flag_id');
            $table->uuid('tenant_id');
            $table->boolean('is_enabled')->default(false);
            $table->timestamps();

            $table->primary(['flag_id', 'tenant_id']);
            $table->foreign('flag_id')->references('id')->on('feature_flags')->cascadeOnDelete();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feature_flag_tenant');
        Schema::dropIfExists('feature_flags');
    }
};
