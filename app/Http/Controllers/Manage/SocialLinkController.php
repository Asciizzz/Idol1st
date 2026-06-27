<?php

namespace App\Http\Controllers\Manage;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\StoreSocialLinkRequest;
use App\Http\Resources\SocialLinkResource;
use App\Models\IdolProfile;
use App\Models\SocialLink;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class SocialLinkController extends Controller
{
    /**
     * POST /api/manage/idol/social-links
     *
     * Upsert — one link per platform per idol profile.
     * Creates or updates based on [idol_profile_id, platform].
     */
    public function upsert(StoreSocialLinkRequest $request): JsonResponse
    {
        $tenant  = app(Tenant::class);
        $profile = IdolProfile::where('tenant_id', $tenant->id)->firstOrFail();

        $link = SocialLink::updateOrCreate(
            [
                'idol_profile_id' => $profile->id,
                'platform'        => $request->platform,
            ],
            [
                'id'  => Str::uuid(),
                'url' => $request->url,
            ]
        );

        return response()->json([
            'success' => true,
            'data'    => new SocialLinkResource($link),
        ]);
    }
}
