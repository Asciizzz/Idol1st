<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IdolEvent extends Model
{
    use BelongsToTenant;
    use HasUuids;

    protected $fillable = [
        'tenant_id',
        'title',
        'description',
        'event_type',
        'start_datetime',
        'end_datetime',
        'location',
        'ticket_url',
        'visibility',
        'status',
    ];

    protected $casts = [
        'start_datetime' => 'datetime',
        'end_datetime'   => 'datetime',
    ];

    protected $appends = ['rsvp_counts'];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function rsvps(): HasMany
    {
        return $this->hasMany(EventRsvp::class, 'event_id');
    }

    /**
     * Return RSVP counts in a single aggregated query.
     * e.g. ['GOING' => 42, 'INTERESTED' => 17, 'NOT_GOING' => 3]
     */
    public function getRsvpCountsAttribute(): array
    {
        $counts = $this->rsvps()
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        return [
            'going'      => (int) ($counts['GOING']      ?? 0),
            'interested' => (int) ($counts['INTERESTED'] ?? 0),
            'not_going'  => (int) ($counts['NOT_GOING']  ?? 0),
        ];
    }
}
