<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('email');
            $table->string('username');
            $table->string('display_name')->nullable();
            $table->string('avatar_url')->nullable();
            $table->string('password');
            $table->timestamps();

            // Email and username are unique per tenant
            $table->unique(['tenant_id', 'email']);
            $table->unique(['tenant_id', 'username']);
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        // Retroactively add FK constraints deferred from Step 11
        Schema::table('blog_comments', function (Blueprint $table) {
            $table->foreign('fan_id')->references('id')->on('fans')->cascadeOnDelete();
        });

        Schema::table('blog_post_likes', function (Blueprint $table) {
            $table->foreign('fan_id')->references('id')->on('fans')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('blog_post_likes', function (Blueprint $table) {
            $table->dropForeign(['fan_id']);
        });
        Schema::table('blog_comments', function (Blueprint $table) {
            $table->dropForeign(['fan_id']);
        });
        Schema::dropIfExists('fans');
    }
};
