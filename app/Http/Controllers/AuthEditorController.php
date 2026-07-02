<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\View\View;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\ServiceAdmin;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

use Illuminate\Http\RedirectResponse;

class AuthEditorController extends Controller
{
    public function showEditor(Request $request): View
    {
        $draft        = $this->resolveDraft($request);
        $initialGraph = $this->resolveInitialGraph();

        return view('tenant-panel', [
            'sanctumToken' => session('sanctum_token'),
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

    public function uploadAsset(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240'], // 10MB max, adjust as needed
        ]);

        $file = $request->file('file');

        // Save to storage/app/public/editor-assets
        $path = $file->store('editor-assets', 'public');

        return response()->json([
            'ok'   => true,
            'url'  => Storage::url($path),
            'name' => $file->getClientOriginalName(),
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
        if (! Auth::attempt(['email' => $request->email,'password' => $request->password,]))
        {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials.',
            ], 401);
        }

        $user  = Auth::user();
        // Ensure the user belongs to the current tenant.
        if (app()->bound(\App\Models\Tenant::class) &&
            $user->tenant_id !== $request->tenant()->id)
        {
            Auth::logout();

            return response()->json([
                'success'=>false,
                'message'=>'User does not belong to this tenant.'
            ],403);

        }
        $token = $user->createToken('web-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'token'   => $token,
            'user'    => new UserResource($user),
        ]);
    }

    /**
     * POST /api/auth/editor/logout
     *
     * Revokes the current access token.
     */
    public function logout(Request $request): JsonResponse
    {
        // Revoke only the token that was used to authenticate this request.
        // Ensure no crash happens if the user is not authenticated (e.g., token already revoked).
        $request->user()?->currentAccessToken()?->delete();

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

    /**
     * GET /login
     * Show the login form. Redirect to editor if already authenticated.
     */
    public function showLogin(): View|RedirectResponse
    {
        $serviceAdminToken = session('service_admin_sanctum_token');
        if ($serviceAdminToken) {
            $accessToken = PersonalAccessToken::findToken($serviceAdminToken);
            $tokenable = $accessToken?->tokenable;

            if ($tokenable instanceof ServiceAdmin && $tokenable->is_active) {
                return redirect()->route('admin');
            }

            session()->forget('service_admin_sanctum_token');
        }

        if (Auth::check()) {
            return redirect()->route('editor');
        }

        return view('login');
    }

    /**
     * POST /login
     * Authenticate via session (web guard) for blade views.
     * On success, also mint a Sanctum token and store it in the session
     * so the editor's JS can pick it up for API calls.
     */
    public function handleLogin(Request $request): RedirectResponse
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($request->only('email', 'password'), remember: true)) {
            $serviceAdmin = ServiceAdmin::where('email', $request->email)->first();

            if (! $serviceAdmin || ! Hash::check($request->password, $serviceAdmin->password)) {
                return back()
                    ->withInput($request->only('email'))
                    ->withErrors(['email' => 'Invalid credentials.']);
            }

            if (! $serviceAdmin->is_active) {
                return back()
                    ->withInput($request->only('email'))
                    ->withErrors(['email' => 'This service admin account has been deactivated.']);
            }

            $request->session()->regenerate();

            $token = $serviceAdmin->createToken('platform-admin-web-session')->plainTextToken;
            $request->session()->put('service_admin_sanctum_token', $token);
            $request->session()->forget('sanctum_token');

            return redirect()->route('admin');
        }

        $request->session()->regenerate();

        // Mint a Sanctum token and store it in the session so vsb.js
        // can read window.__VSB_TOKEN__ for API calls without a separate login.
        $user  = Auth::user();
        $token = $user->createToken('web-session')->plainTextToken;
        $request->session()->put('sanctum_token', $token);
        $request->session()->forget('service_admin_sanctum_token');

        // Tenant admins use the editor workspace.
        // Reserve /admin for non-tenant admin users only.
        return ($user->role === 'admin' && ! $user->is_tenant_admin)
            ? redirect()->route('admin')
            : redirect()->route('editor');
    }

    /**
     * POST /logout
     * Revoke the session Sanctum token and log the user out.
     */
    public function webLogout(Request $request): RedirectResponse
    {
        $serviceAdminToken = $request->session()->get('service_admin_sanctum_token');
        if ($serviceAdminToken) {
            PersonalAccessToken::findToken($serviceAdminToken)?->delete();
            $request->session()->forget('service_admin_sanctum_token');
        }

        // Revoke the session-stored Sanctum token if it exists
        $user = Auth::user();
        if ($user) {
            $user->tokens()->where('name', 'web-session')->delete();
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    /**
     * GET /admin
     * Show the admin panel. Role check is handled by middleware.
     */
    public function showAdmin(): View
    {
        return view('admin', [
            'sanctumToken' => session('service_admin_sanctum_token') ?? session('sanctum_token'),
        ]);
    }
}
