<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PublishedSite extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'project_id',
        'snapshot_id',
        'domain',
        'html_snapshot',
        'published_at',
    ];

    protected $casts = [
        'published_at' => 'datetime',
    ];

    // ── Relationships ─────────────────────────────────────────

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function snapshot(): BelongsTo
    {
        return $this->belongsTo(ProjectSnapshot::class, 'snapshot_id');
    }
}
