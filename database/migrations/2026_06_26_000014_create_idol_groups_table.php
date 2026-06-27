<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('idol_groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('group_name');
            $table->date('debut_date')->nullable();
            $table->string('agency')->nullable();
            $table->text('bio')->nullable();
            $table->string('profile_image_url')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::create('idol_group_members', function (Blueprint $table) {
            $table->uuid('group_id');
            $table->uuid('idol_profile_id');

            $table->primary(['group_id', 'idol_profile_id']);
            $table->foreign('group_id')->references('id')->on('idol_groups')->cascadeOnDelete();
            $table->foreign('idol_profile_id')->references('id')->on('idol_profiles')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idol_group_members');
        Schema::dropIfExists('idol_groups');
    }
};
