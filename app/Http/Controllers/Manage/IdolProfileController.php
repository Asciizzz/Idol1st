<?php

namespace App\Http\Controllers\Manage;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\UpdateIdolProfileRequest;
use App\Http\Resources\IdolProfileResource;
use App\Models\IdolProfile;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class IdolProfileController extends Controller
{
    /**
     * GET /api/manage/idol/profile
     *
     * Returns the tenant's idol profile, creating a blank one
     * if it doesn't exist yet (first-time setup).
     */
    public function show(): JsonResponse
    {
        $tenant  = app(Tenant::class);
        $profile = IdolProfile::with('socialLinks')
            ->where('tenant_id', $tenant->id)
            ->firstOrCreate(
                ['tenant_id' => $tenant->id],
                ['id' => Str::uuid(), 'stage_name' => $tenant->name]
            );

        return response()->json([
            'success' => true,
            'data'    => new IdolProfileResource($profile),
        ]);
    }

    /**
     * PUT /api/manage/idol/profile
     *
     * Multipart update — handles text fields and optional image uploads.
     */
    public function update(UpdateIdolProfileRequest $request): JsonResponse
    {
        $tenant  = app(Tenant::class);
        $profile = IdolProfile::where('tenant_id', $tenant->id)
            ->firstOrCreate(
                ['tenant_id' => $tenant->id],
                ['id' => Str::uuid(), 'stage_name' => $tenant->name]
            );

        $data = $request->only([
            'stage_name', 'bio', 'debut_date', 'agency', 'nationality', 'status',
        ]);

        // Handle profile image upload
        if ($request->hasFile('profile_image')) {
            $this->deleteOldImage($profile->profile_image_url);
            $data['profile_image_url'] = $this->storeImage(
                $request->file('profile_image'),
                "idol-profiles/{$tenant->id}/profile"
            );
        }

        // Handle banner image upload
        if ($request->hasFile('banner_image')) {
            $this->deleteOldImage($profile->banner_image_url);
            $data['banner_image_url'] = $this->storeImage(
                $request->file('banner_image'),
                "idol-profiles/{$tenant->id}/banner"
            );
        }

        $profile->update($data);

        return response()->json([
            'success' => true,
            'data'    => new IdolProfileResource($profile->fresh('socialLinks')),
        ]);
    }

    private function storeImage($file, string $directory): string
    {
        $path = $file->storeAs(
            $directory,
            Str::uuid() . '.' . $file->getClientOriginalExtension(),
            ['disk' => config('filesystems.default'), 'visibility' => 'public']
        );

        return Storage::disk(config('filesystems.default'))->url($path);
    }

    private function deleteOldImage(?string $url): void
    {
        if (! $url) return;

        // Extract the storage path from the URL and delete it
        $path = str_replace(Storage::disk(config('filesystems.default'))->url(''), '', $url);
        Storage::disk(config('filesystems.default'))->delete($path);
    }
}
