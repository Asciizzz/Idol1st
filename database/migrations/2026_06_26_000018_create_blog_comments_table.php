<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_comments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('post_id');
            $table->uuid('fan_id');
            $table->text('content');
            $table->boolean('is_hidden')->default(false);
            $table->timestamps();

            $table->foreign('post_id')->references('id')->on('blog_posts')->cascadeOnDelete();
            // fan_id FK added after fans table exists in Step 12
        });

        Schema::create('blog_post_likes', function (Blueprint $table) {
            $table->uuid('post_id');
            $table->uuid('fan_id');

            $table->primary(['post_id', 'fan_id']);
            $table->foreign('post_id')->references('id')->on('blog_posts')->cascadeOnDelete();
            // fan_id FK added after fans table exists in Step 12
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_post_likes');
        Schema::dropIfExists('blog_comments');
    }
};
