<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectSnapshot extends Model
{
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


    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }


    public static function nextVersion(Project $project): int
    {
        $max = static::where('project_id', $project->id)->max('version');

        return ($max ?? 0) + 1;
    }
}
