<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->enum('status', ['ACTIVE', 'SUSPENDED', 'DELETED', 'PENDING'])->default('PENDING');
            $table->uuid('created_by')->nullable(); // references service_admins (Step 9)
            $table->json('config')->nullable();     // branding_logo, branding_colors, custom_domain, settings
            $table->timestamp('suspended_at')->nullable();
            $table->string('suspension_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
