<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->longText('graph_data');      // raw VsGraph JSON blob — do not cast to array
            $table->longText('compiled_html')->nullable();
            $table->longText('compiled_css')->nullable();
            $table->longText('compiled_js')->nullable();
            $table->unsignedInteger('version');  // per-project version counter
            $table->timestamp('created_at')->useCurrent();

            // Enforce uniqueness of version per project
            $table->unique(['project_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_snapshots');
    }
};
