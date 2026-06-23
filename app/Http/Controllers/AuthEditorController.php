<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\View\View;

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
}
