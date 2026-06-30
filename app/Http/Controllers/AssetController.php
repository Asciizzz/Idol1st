<?php

namespace App\Http\Controllers;

use App\Http\Requests\Asset\StoreAssetRequest;
use App\Http\Resources\AssetResource;
use App\Models\Asset;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AssetController extends Controller
{
    /**
     * GET /api/projects/{project}/assets
     *
     * List all assets belonging to a project.
     * Scoped to the authenticated user via ProjectPolicy.
     */
    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $assets = $project->assets()->orderByDesc('created_at')->get();

        return response()->json([
            'success' => true,
            'data'    => AssetResource::collection($assets),
        ]);
    }

    /**
     * POST /api/projects/{project}/assets
     *
     * Upload a new asset and associate it with the project.
     * File is stored on the configured default filesystem disk.
     */
    public function store(StoreAssetRequest $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $file     = $request->file('file');
        $mime     = $file->getMimeType();
        $type     = Asset::typeFromMime($mime);
        $disk     = config('filesystems.default');

        // Store under assets/{user_id}/{type}/{uuid}.{ext}
        // Using a UUID prevents filename collisions and avoids exposing
        // original filenames in the storage path.
        $extension = $file->getClientOriginalExtension() ?: $file->guessExtension();
        $path = $file->storeAs(
            "assets/{$request->user()->tenant_id}/{$request->user()->id}/{$type}",
            Str::uuid() . '.' . $extension,
            ['disk' => $disk, 'visibility' => 'public']
        );

        $asset = Asset::create([
            'user_id'    => $request->user()->id,
            'project_id' => $project->id,
            'type'       => $type,
            'filename'   => $file->getClientOriginalName(),
            'path'       => $path,
            'mime_type'  => $mime,
            'size'       => $file->getSize(),
            'created_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data'    => new AssetResource($asset),
        ], 201);
    }

    /**
     * DELETE /api/projects/{project}/assets/{asset}
     *
     * Delete an asset record and remove the file from storage.
     */
    public function destroy(Project $project, Asset $asset): JsonResponse
    {
        $this->authorize('view', $project);
        $this->authorize('delete', $asset);

        // Remove the file from disk before deleting the record
        Storage::disk(config('filesystems.default'))->delete($asset->path);

        $asset->delete();

        return response()->json([
            'success' => true,
            'message' => 'Asset deleted.',
        ]);
    }
}
