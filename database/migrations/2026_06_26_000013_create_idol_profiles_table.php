<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('idol_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->unique(); // one profile per tenant
            $table->string('stage_name');
            $table->text('bio')->nullable();
            $table->date('debut_date')->nullable();
            $table->string('agency')->nullable();
            $table->string('nationality')->nullable();
            $table->string('profile_image_url')->nullable();
            $table->string('banner_image_url')->nullable();
            $table->enum('status', ['ACTIVE', 'HIATUS', 'RETIRED'])->default('ACTIVE');
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idol_profiles');
    }
};
