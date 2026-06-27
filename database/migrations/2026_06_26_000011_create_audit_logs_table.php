<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->uuid('admin_id');
            $table->string('action');          // e.g. TENANT_SUSPENDED, PLAN_CHANGED
            $table->string('target_entity');   // e.g. Tenant, Plan, FeatureFlag
            $table->uuid('target_id')->nullable();
            $table->timestamp('performed_at')->useCurrent();

            $table->index('tenant_id');
            $table->index('admin_id');
            $table->index('action');
            $table->index('performed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
