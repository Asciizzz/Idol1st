<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\View\View;

class AuthEditorController extends Controller
{
    public function showAuth(): View
    {
        return view('auth');
    }

    public function showLogin(): View
    {
        return $this->showAuth();
    }

    public function login(Request $request): RedirectResponse
    {
        return redirect()->route('editor');
    }

    public function showSignup(): View
    {
        return $this->showAuth();
    }

    public function signup(Request $request): RedirectResponse
    {
        return redirect()->route('editor');
    }

    public function showSetup(Request $request): View
    {
        return view('setup', [
            'draft' => $request->session()->get('site_draft', []),
        ]);
    }

    public function saveSetup(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'site_type' => ['required', 'in:idol,agency'],
            'project_name' => ['required', 'string', 'max:150'],
            'subdomain' => ['required', 'string', 'max:80', 'regex:/^[a-z0-9-]+$/'],
            'template_key' => ['required', 'in:spotlight,neon-stage,classic-label,agency-grid'],
            'theme_color' => ['required', 'string', 'size:7', 'regex:/^#[A-Fa-f0-9]{6}$/'],
        ]);

        $pagePath = preg_replace('/[^a-z0-9-]/', '-', strtolower($validated['project_name']));
        $pagePath = trim((string) $pagePath, '-');
        $pagePath = $pagePath !== '' ? $pagePath : 'home';

        $draft = [
            'site_type' => $validated['site_type'],
            'project_name' => $validated['project_name'],
            'subdomain' => $validated['subdomain'],
            'domain' => $validated['subdomain'] . '.idol1st.app',
            'project_path' => $pagePath,
            'template_key' => $validated['template_key'],
            'theme_color' => $validated['theme_color'],
            'owner_user_id' => (string) $request->user()->id,
        ];

        $request->session()->put('site_draft', $draft);

        return redirect()->route('editor');
    }

    public function showEditor(Request $request): View|RedirectResponse
    {
        $draft = $this->resolveDraft($request);

        $initialProject = $this->resolveInitialBuilderProject($request, $draft);

        return view('editor', [
            'draft' => $draft,
            'initialProject' => $initialProject,
        ]);
    }

    public function saveEditor(Request $request): JsonResponse
    {
        $draft = $this->resolveDraft($request);

        if ($request->has('project_json')) {
            $validated = $request->validate([
                'project_json' => ['required', 'array'],
                'project_json.project' => ['nullable', 'array'],
                'project_json.pages' => ['required', 'array'],
                'project_json.stylesheets' => ['nullable', 'array'],
                'project_json.scripts' => ['nullable', 'array'],
            ]);

            $payload = [
                'project_json' => $validated['project_json'],
                'meta' => [
                    'saved_at' => now()->toIso8601String(),
                    'site' => $draft,
                ],
            ];

            $directory = 'private/site-drafts';
            $fileName = $this->buildDraftFileName($request, $draft);

            Storage::put($directory . '/' . $fileName, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            return response()->json([
                'ok' => true,
                'message' => 'Builder project saved successfully.',
                'file' => 'storage/app/' . $directory . '/' . $fileName,
            ]);
        }

        $validated = $request->validate([
            'project' => ['required', 'string', 'max:150'],
            'domain' => ['required', 'string', 'max:190'],
            'pages' => ['required', 'array', 'min:1'],
            'pages.*.name' => ['required', 'string', 'max:120'],
            'pages.*.elements' => ['required', 'array', 'min:1'],
            'pages.*.elements.*.type' => ['required', 'string', 'max:60'],
            'pages.*.elements.*.text' => ['nullable', 'string'],
            'pages.*.elements.*.attributes' => ['nullable', 'array'],
            'pages.*.elements.*.children' => ['nullable', 'array'],
            'pages.*.include' => ['nullable', 'array'],
            'pages.*.include.js' => ['nullable', 'array'],
            'pages.*.include.js.*' => ['string', 'max:120'],
            'pages.*.include.css' => ['nullable', 'array'],
            'pages.*.include.css.*' => ['string', 'max:120'],
            'styles' => ['nullable', 'array'],
        ]);

        $payload = [
            'project' => $validated['project'],
            'domain' => $validated['domain'],
            'meta' => [
                'saved_at' => now()->toIso8601String(),
                'site' => $draft,
            ],
            'pages' => $validated['pages'],
            'styles' => $validated['styles'] ?? [],
        ];

        $directory = 'private/site-drafts';
        $fileName = $this->buildDraftFileName($request, $draft);

        Storage::put($directory . '/' . $fileName, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        return response()->json([
            'ok' => true,
            'message' => 'Draft saved successfully.',
            'file' => 'storage/app/' . $directory . '/' . $fileName,
        ]);
    }

    public function signout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('editor');
    }

    private function buildDraftFileName(Request $request, array $draft): string
    {
        $ownerId = Auth::id() ? (string) Auth::id() : ('guest-' . substr(hash('sha256', (string) $request->session()->getId()), 0, 12));
        $safeSlug = preg_replace('/[^a-z0-9-]/', '-', strtolower((string) ($draft['subdomain'] ?? '')));
        $safeSlug = trim((string) $safeSlug, '-');
        $safeSlug = $safeSlug !== '' ? $safeSlug : 'untitled';

        return sprintf('%s_%s.json', $ownerId, $safeSlug);
    }

    private function resolveDraft(Request $request): array
    {
        $draft = $request->session()->get('site_draft');
        if (is_array($draft) && $draft !== []) {
            return $draft;
        }

        return [
            'site_type' => 'idol',
            'project_name' => 'Example Project',
            'subdomain' => 'example',
            'domain' => 'example.idol1st.app',
            'project_path' => 'home',
            'template_key' => 'spotlight',
            'theme_color' => '#ff4d4f',
            'owner_user_id' => Auth::id() ? (string) Auth::id() : 'guest',
        ];
    }

    private function resolveInitialBuilderProject(Request $request, array $draft): array
    {
        $storedPath = storage_path('app/private/site-drafts/' . $this->buildDraftFileName($request, $draft));
        if (File::exists($storedPath)) {
            $decoded = json_decode((string) File::get($storedPath), true);
            if (is_array($decoded) && isset($decoded['project_json']) && is_array($decoded['project_json'])) {
                return $this->normalizeBuilderProject($decoded['project_json'], $draft);
            }
        }

        $examplePath = public_path('jsons/example.json');
        if (File::exists($examplePath)) {
            $decoded = json_decode((string) File::get($examplePath), true);
            if (is_array($decoded)) {
                return $this->normalizeBuilderProject($decoded, $draft);
            }
        }

        return $this->normalizeBuilderProject([], $draft);
    }

    private function normalizeBuilderProject(array $project, array $draft): array
    {
        $normalized = [
            'project' => is_array($project['project'] ?? null) ? $project['project'] : [],
            'pages' => is_array($project['pages'] ?? null) ? $project['pages'] : [],
            'stylesheets' => is_array($project['stylesheets'] ?? null) ? $project['stylesheets'] : [],
            'scripts' => is_array($project['scripts'] ?? null) ? $project['scripts'] : [],
        ];

        if (!isset($normalized['project']['name']) && isset($draft['project_name'])) {
            $normalized['project']['name'] = (string) $draft['project_name'];
        }

        if (!isset($normalized['project']['domain']) && isset($draft['domain'])) {
            $normalized['project']['domain'] = (string) $draft['domain'];
        }

        return $normalized;
    }
}
