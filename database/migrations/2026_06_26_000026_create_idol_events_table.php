<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('idol_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('event_type', ['CONCERT', 'FANSIGN', 'LIVESTREAM', 'ANNIVERSARY', 'COMEBACK']);
            $table->timestamp('start_datetime');
            $table->timestamp('end_datetime')->nullable();
            $table->string('location')->nullable();
            $table->string('ticket_url')->nullable();
            $table->enum('visibility', ['PUBLIC', 'SUBSCRIBERS_ONLY', 'PAID_ONLY'])->default('PUBLIC');
            $table->enum('status', ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'])->default('UPCOMING');
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'start_datetime']);
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::create('event_rsvps', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('event_id');
            $table->uuid('fan_id');
            $table->enum('status', ['GOING', 'INTERESTED', 'NOT_GOING']);
            $table->timestamps();

            // One RSVP per fan per event
            $table->unique(['event_id', 'fan_id']);
            $table->foreign('event_id')->references('id')->on('idol_events')->cascadeOnDelete();
            $table->foreign('fan_id')->references('id')->on('fans')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_rsvps');
        Schema::dropIfExists('idol_events');
    }
};
