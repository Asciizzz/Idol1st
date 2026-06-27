<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('published_sites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('snapshot_id')->constrained('project_snapshots')->restrictOnDelete();
            $table->string('domain')->nullable(); // custom domain, e.g. myidol.com
            $table->longText('html_snapshot');    // final rendered HTML at publish time
            $table->timestamp('published_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('published_sites');
    }
};
