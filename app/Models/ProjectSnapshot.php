<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectSnapshot extends Model
{
    // Snapshots are immutable — no updated_at
    public $timestamps = false;

    protected $fillable = [
        'project_id',
        'graph_data',
        'compiled_html',
        'compiled_css',
        'compiled_js',
        'version',
    ];

    protected $casts = [
        'version'    => 'integer',
        'created_at' => 'datetime',
    ];

    // ── Relationships ─────────────────────────────────────────

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    // ── Version helpers ───────────────────────────────────────

    /**
     * Get the next version number for a given project.
     * Uses MAX(version) + 1 so concurrent saves don't race on a row count.
     */
    public static function nextVersion(int $projectId): int
    {
        $max = static::where('project_id', $projectId)->max('version');

        return ($max ?? 0) + 1;
    }
}
