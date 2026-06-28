<?php

namespace App\Http\Controllers\Fan;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fan\UpdateFanProfileRequest;
use App\Http\Resources\FanResource;
use App\Models\Fan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FanProfileController extends Controller
{
    /**
     * GET /api/profile
     *
     * Return the authenticated fan with their active subscription.
     */
    public function show(Request $request): JsonResponse
    {
        /** @var Fan $fan */
        $fan = $request->user('sanctum');

        return response()->json([
            'success' => true,
            'data'    => new FanResource($fan->load('subscription.tier')),
        ]);
    }

    /**
     * PATCH /api/profile
     *
     * Update display name and/or avatar image.
     */
    public function update(UpdateFanProfileRequest $request): JsonResponse
    {
        /** @var Fan $fan */
        $fan  = $request->user('sanctum');
        $data = [];

        if ($request->has('display_name')) {
            $data['display_name'] = $request->display_name;
        }

        if ($request->hasFile('avatar')) {
            // Delete the old avatar if one exists
            if ($fan->avatar_url) {
                $this->deleteOldAvatar($fan->avatar_url);
            }

            $file      = $request->file('avatar');
            $extension = $file->getClientOriginalExtension() ?: $file->guessExtension();
            $path      = $file->storeAs(
                "avatars/{$fan->id}",
                Str::uuid() . '.' . $extension,
                ['disk' => config('filesystems.default'), 'visibility' => 'public']
            );

            $data['avatar_url'] = Storage::disk(config('filesystems.default'))->url($path);
        }

        if (! empty($data)) {
            $fan->update($data);
        }

        return response()->json([
            'success' => true,
            'data'    => new FanResource($fan->fresh('subscription.tier')),
        ]);
    }

    private function deleteOldAvatar(string $url): void
    {
        $disk = config('filesystems.default');
        $path = str_replace(Storage::disk($disk)->url(''), '', $url);
        Storage::disk($disk)->delete($path);
    }
}
