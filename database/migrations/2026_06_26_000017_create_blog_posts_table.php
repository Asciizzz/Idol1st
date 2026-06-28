<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_posts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('category_id')->nullable();
            $table->string('title');
            $table->longText('content');
            $table->string('cover_image_url')->nullable();
            $table->json('tags')->nullable();
            $table->enum('status', ['DRAFT', 'PUBLISHED', 'ARCHIVED'])->default('DRAFT');
            $table->enum('visibility', ['PUBLIC', 'SUBSCRIBERS_ONLY', 'PAID_ONLY'])->default('PUBLIC');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'visibility']);
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('category_id')->references('id')->on('blog_categories')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_posts');
    }
};
