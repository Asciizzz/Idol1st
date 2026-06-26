<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\View\View;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use Illuminate\Support\Facades\Auth;

class AuthEditorController extends Controller
{
    public function showEditor(Request $request): View
    {
        $draft        = $this->resolveDraft($request);
        $initialGraph = $this->resolveInitialGraph();

        return view('editor', [
            'draft'        => $draft,
            'initialGraph' => $initialGraph,
        ]);
    }

    public function saveEditor(Request $request): JsonResponse
    {
        $draft = $this->resolveDraft($request);

        $validated = $request->validate([
            'graph' => ['required', 'array'],
        ]);

        $payload = [
            'graph' => $validated['graph'],
            'meta'  => [
                'saved_at' => now()->toIso8601String(),
                'draft'    => $draft,
            ],
        ];

        $fileName = $this->buildDraftFileName($request, $draft);
        Storage::put('private/site-drafts/' . $fileName, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        return response()->json([
            'ok'      => true,
            'message' => 'Graph saved.',
            'file'    => 'storage/app/private/site-drafts/' . $fileName,
        ]);
    }

    // ---- Private helpers ----

    private function resolveDraft(Request $request): array
    {
        $draft = $request->session()->get('site_draft');
        if (is_array($draft) && $draft !== []) {
            return $draft;
        }

        return [
            'project_name' => 'Example Project',
            'subdomain'    => 'example',
        ];
    }

    // Returns the raw Agraph blob (label/nodes/edges) to seed the canvas.
    // Checks the session-keyed saved draft first, then falls back to test.json.
    private function resolveInitialGraph(): array|null
    {
        $testPath = public_path('jsons/test.json');
        if (File::exists($testPath)) {
            $decoded = json_decode((string) File::get($testPath), true);
            if (is_array($decoded) && isset($decoded['nodes'])) {
                return $decoded;
            }
        }

        return null;
    }

    private function buildDraftFileName(Request $request, array $draft): string
    {
        $sessionId = substr(hash('sha256', (string) $request->session()->getId()), 0, 12);
        $safeSlug  = preg_replace('/[^a-z0-9-]/', '-', strtolower((string) ($draft['subdomain'] ?? '')));
        $safeSlug  = trim((string) $safeSlug, '-');
        $safeSlug  = $safeSlug !== '' ? $safeSlug : 'untitled';

        return sprintf('%s_%s.json', $sessionId, $safeSlug);
    }

    /**
     * POST /api/auth/login
     *
     * Validates credentials and issues a Sanctum token.
     * Response shape matches idol_saas_api.yaml § Fan - Auth › login,
     * using `user` instead of `fan` since this is the VSB editor layer.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        if (! Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials.',
            ], 401);
        }

        $user  = Auth::user();
        $token = $user->createToken('editor-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'token'   => $token,
            'user'    => new UserResource($user),
        ]);
    }

    /**
     * POST /api/auth/logout
     *
     * Revokes the current access token.
     */
    public function logout(Request $request): JsonResponse
    {
        // Revoke only the token that was used to authenticate this request.
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * GET /api/auth/me
     *
     * Returns the authenticated user's profile.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'user'    => new UserResource($request->user()),
        ]);
    }
}
