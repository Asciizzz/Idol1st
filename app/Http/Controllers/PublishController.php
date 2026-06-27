<?php

namespace App\Http\Controllers;

use App\Http\Requests\Publish\PublishRequest;
use App\Http\Resources\PublishedSiteResource;
use App\Models\Project;
use App\Models\PublishedSite;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PublishController extends Controller
{
    /**
     * POST /api/projects/{project}/publish
     *
     * Promotes a snapshot to the live published site.
     * If no version is specified, the latest snapshot is used.
     *
     * Each publish creates a new PublishedSite record so the full
     * publish history is preserved. The "live" site is always the
     * most recently published record for the project.
     */
    public function publish(PublishRequest $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        // Resolve which snapshot to publish
        $snapshot = $request->filled('version')
            ? $project->snapshots()->where('version', $request->version)->firstOrFail()
            : $project->snapshots()->orderByDesc('version')->firstOrFail();

        if (! $snapshot->compiled_html) {
            return response()->json([
                'success' => false,
                'message' => 'Snapshot has no compiled HTML. Run compile before publishing.',
            ], 422);
        }

        $published = DB::transaction(function () use ($project, $snapshot, $request) {
            // Create the publish record
            $site = PublishedSite::create([
                'project_id'    => $project->id,
                'snapshot_id'   => $snapshot->id,
                'domain'        => $request->input('domain'),
                'html_snapshot' => $snapshot->compiled_html,
                'published_at'  => now(),
            ]);

            // Mark the project as published
            $project->update(['status' => 'published']);

            return $site->load('snapshot');
        });

        return response()->json([
            'success' => true,
            'data'    => new PublishedSiteResource($published),
        ], 201);
    }

    /**
     * GET /api/projects/{project}/published
     *
     * Return the current live published site for a project.
     * Useful for the editor to show publish status and history.
     */
    public function show(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $site = PublishedSite::where('project_id', $project->id)
            ->orderByDesc('published_at')
            ->with('snapshot')
            ->first();

        if (! $site) {
            return response()->json([
                'success' => false,
                'message' => 'This project has not been published yet.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => new PublishedSiteResource($site),
        ]);
    }
}
