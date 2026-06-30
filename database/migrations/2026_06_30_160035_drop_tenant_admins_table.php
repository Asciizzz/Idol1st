<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('tenant_admins');
    }

    public function down(): void
    {
        Schema::create('tenant_admins', function ($table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('name');
            $table->string('email');
            $table->string('password');
            $table->timestamps();
        });
    }
};
