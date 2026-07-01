<?php

namespace App\Http\Controllers;

use App\Http\Requests\Project\StoreProjectRequest;
use App\Http\Requests\Project\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Models\ProjectSnapshot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProjectController extends Controller
{
    /**
     * GET /api/projects
     *
     * List all projects belonging to the authenticated user.
     * Admins see all projects (handled by ProjectPolicy::before).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $tenant = $request->tenant();


        $projects = Project::where(
                'tenant_id',
                $tenant->id
            )
            ->latest()
            ->paginate(20);


        return ProjectResource::collection($projects);
    }

    /**
     * POST /api/projects
     *
     * Create a new project for the authenticated user.
     */
    public function store(StoreProjectRequest $request): JsonResponse
    {
        $this->authorize('create', Project::class);

        $project = Project::create([
            'user_id'   => $request->user()->id,
            'tenant_id' => $request->tenant()->id,

            'name'      => $request->name,
            'slug'      => Project::generateUniqueSlug($request->name),
            'status'    => $request->input('status', 'draft'),
            'settings'  => $request->input('settings'),
        ]);

        ProjectSnapshot::create([
            'project_id'    => $project->id,
            'graph_data'    => json_encode(['nodes' => [], 'edges' => []]),
            'compiled_html' => null,
            'compiled_css'  => null,
            'compiled_js'   => null,
            'version'       => 1,
            'created_at'    => now(),
        ]);

        return response()->json([
            'success' => true,
            'data'    => new ProjectResource($project),
        ], 201);
    }

    /**
     * GET /api/projects/{id}
     *
     * Return a single project. Policy ensures ownership.
     */
    public function show(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json([
            'success' => true,
            'data'    => new ProjectResource($project),
        ]);
    }

    /**
     * PUT /api/projects/{id}
     *
     * Update name, status, or settings. Slug is re-generated only
     * when the name changes, preserving any existing published URLs.
     */
    public function update(UpdateProjectRequest $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $data = $request->only(['status', 'settings']);

        if ($request->filled('name') && $request->name !== $project->name) {
            $data['name'] = $request->name;
            $data['slug'] = Project::generateUniqueSlug($request->name);
        }

        $project->update($data);

        return response()->json([
            'success' => true,
            'data'    => new ProjectResource($project->fresh()),
        ]);
    }

    /**
     * DELETE /api/projects/{id}
     *
     * Permanently delete a project and its children (cascade on DB level).
     */
    public function destroy(Project $project): JsonResponse
    {
        $this->authorize('delete', $project);

        $project->delete();

        return response()->json([
            'success' => true,
            'message' => 'Project deleted.',
        ]);
    }
}
