<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Asset extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'project_id',
        'type',
        'filename',
        'path',
        'mime_type',
        'size',
    ];

    protected $casts = [
        'size'       => 'integer',
        'created_at' => 'datetime',
    ];

    // ── Relationships ─────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    // ── Helpers ───────────────────────────────────────────────

    /**
     * Full public URL to the stored file.
     * Switches between local public disk and S3 automatically via
     * Laravel's filesystem abstraction.
     */
    public function getUrlAttribute(): string
    {
        return Storage::disk(config('filesystems.default'))->url($this->path);
    }

    /**
     * Derive the asset type enum value from a MIME type string.
     */
    public static function typeFromMime(string $mime): string
    {
        return match (true) {
            str_starts_with($mime, 'image/')                              => 'image',
            str_starts_with($mime, 'audio/')                              => 'audio',
            in_array($mime, ['font/ttf', 'font/woff', 'font/woff2',
                             'application/font-woff', 'application/font-woff2',
                             'application/x-font-ttf'])                   => 'font',
            default                                                        => 'image', // fallback; validation should prevent reaching here
        };
    }
}
