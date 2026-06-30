<?php

namespace App\Http\Controllers;

use App\Http\Requests\Snapshot\StoreSnapshotRequest;
use App\Http\Resources\SnapshotResource;
use App\Models\Project;
use App\Models\ProjectSnapshot;
use Illuminate\Http\JsonResponse;

class SnapshotController extends Controller
{
    /**
     * GET /api/projects/{project}/snapshots
     *
     * List all snapshots for a project, newest first.
     * Returns a lightweight list — graph_data is excluded to keep
     * payload small. The frontend fetches a specific version to get the blob.
     */
    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $snapshots = $project->snapshots()
            ->select(['id', 'project_id', 'version', 'created_at'])
            ->orderByDesc('version')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $snapshots,
        ]);
    }

    /**
     * POST /api/projects/{project}/snapshots
     *
     * Save a new versioned snapshot of the VSB graph state.
     * Version is auto-incremented per project.
     *
     * Also called internally by CompilerController (Step 4) —
     * that's why compiled_* fields are optional here.
     */
    public function store(StoreSnapshotRequest $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        // Normalize graph_data to a JSON string regardless of whether the
        // frontend sent it as a string or a decoded object.
        $graphData = $request->input('graph_data');
        if (! is_string($graphData)) {
            $graphData = json_encode($graphData);
        }

        $snapshot = ProjectSnapshot::create([
            'project_id'    => $project->id,
            'graph_data'    => $graphData,
            'compiled_html' => $request->input('compiled_html'),
            'compiled_css'  => $request->input('compiled_css'),
            'compiled_js'   => $request->input('compiled_js'),
            'version'       => ProjectSnapshot::nextVersion($project),
            'created_at'    => now(),
        ]);

        return response()->json([
            'success' => true,
            'data'    => new SnapshotResource($snapshot),
        ], 201);
    }

    /**
     * GET /api/projects/{project}/snapshots/{version}
     *
     * Retrieve a specific snapshot by version number (not by ID).
     * The frontend uses this to restore a previous graph state.
     */
    public function show(Project $project, int $version): JsonResponse
    {
        $this->authorize('view', $project);

        $snapshot = $project->snapshots()
            ->where('version', $version)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data'    => new SnapshotResource($snapshot),
        ]);
    }
}
