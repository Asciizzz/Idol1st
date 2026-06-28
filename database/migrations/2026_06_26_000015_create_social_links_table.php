<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('idol_profile_id');
            $table->enum('platform', ['TWITTER', 'INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'WEIBO']);
            $table->string('url');
            $table->unsignedBigInteger('follower_count')->default(0);
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            // One link per platform per idol
            $table->unique(['idol_profile_id', 'platform']);
            $table->foreign('idol_profile_id')->references('id')->on('idol_profiles')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_links');
    }
};
