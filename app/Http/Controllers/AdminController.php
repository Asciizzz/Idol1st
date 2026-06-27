<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProjectResource;
use App\Http\Resources\UserResource;
use App\Models\Asset;
use App\Models\Project;
use App\Models\ProjectSnapshot;
use App\Models\PublishedSite;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    /**
     * GET /api/admin/users
     *
     * Paginated list of all users on the platform.
     * Supports search by name or email, and filter by role.
     */
    public function users(Request $request): JsonResponse
    {
        $query = User::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        $users = $query->latest()->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data'    => UserResource::collection($users),
            'meta'    => [
                'current_page' => $users->currentPage(),
                'per_page'     => $users->perPage(),
                'total'        => $users->total(),
                'last_page'    => $users->lastPage(),
            ],
        ]);
    }

    /**
     * GET /api/admin/projects
     *
     * Paginated list of all projects across all users.
     * Supports search by name or slug, and filter by status.
     */
    public function projects(Request $request): JsonResponse
    {
        $query = Project::with('user');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $projects = $query->latest()->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data'    => ProjectResource::collection($projects),
            'meta'    => [
                'current_page' => $projects->currentPage(),
                'per_page'     => $projects->perPage(),
                'total'        => $projects->total(),
                'last_page'    => $projects->lastPage(),
            ],
        ]);
    }

    /**
     * GET /api/admin/stats
     *
     * Global platform stats for the admin dashboard.
     */
    public function stats(): JsonResponse
    {
        $totalUsers     = User::count();
        $totalProjects  = Project::count();
        $publishedCount = Project::where('status', 'published')->count();
        $draftCount     = Project::where('status', 'draft')->count();
        $totalSnapshots = ProjectSnapshot::count();
        $totalAssets    = Asset::count();
        $totalAssetSize = Asset::sum('size'); // bytes

        // New users in the last 30 days
        $newUsers = User::where('created_at', '>=', now()->subDays(30))->count();

        // New projects in the last 30 days
        $newProjects = Project::where('created_at', '>=', now()->subDays(30))->count();

        // Most recent publish
        $lastPublished = PublishedSite::orderByDesc('published_at')
            ->with('project:id,name,slug')
            ->first();

        return response()->json([
            'success' => true,
            'data'    => [
                'users' => [
                    'total'       => $totalUsers,
                    'new_30_days' => $newUsers,
                    'by_role'     => [
                        'admin'   => User::where('role', 'admin')->count(),
                        'editor'  => User::where('role', 'editor')->count(),
                        'viewer'  => User::where('role', 'viewer')->count(),
                    ],
                ],
                'projects' => [
                    'total'       => $totalProjects,
                    'new_30_days' => $newProjects,
                    'published'   => $publishedCount,
                    'draft'       => $draftCount,
                ],
                'snapshots' => [
                    'total' => $totalSnapshots,
                ],
                'assets' => [
                    'total'      => $totalAssets,
                    'total_size' => $totalAssetSize,
                    'total_size_mb' => round($totalAssetSize / 1048576, 2),
                ],
                'last_published' => $lastPublished ? [
                    'project'      => $lastPublished->project?->name,
                    'slug'         => $lastPublished->project?->slug,
                    'published_at' => $lastPublished->published_at,
                ] : null,
            ],
        ]);
    }
}
