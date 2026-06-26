<?php

namespace App\Http\Controllers;

use App\Http\Requests\Compiler\CompileRequest;
use App\Http\Resources\SnapshotResource;
use App\Models\Project;
use App\Models\ProjectSnapshot;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CompilerController extends Controller
{
    /**
     * POST /api/projects/{project}/compile
     *
     * Called by VirtualSiteBuilder/compiler.js after a client-side compile.
     * Receives the full graph JSON alongside compiled HTML, CSS, and JS strings,
     * then stores everything as a new versioned ProjectSnapshot.
     *
     * This is intentionally separate from SnapshotController::store so that:
     *   - compile always requires all three compiled outputs (strict validation)
     *   - compile can later add server-side sanitization without touching snapshot logic
     *   - the two concerns stay independently evolvable
     */
    public function compile(CompileRequest $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        // Normalize graph_data to a JSON string
        $graphData = $request->input('graph_data');
        if (! is_string($graphData)) {
            $graphData = json_encode($graphData);
        }

        // Wrap in a transaction — version increment + insert must be atomic
        $snapshot = DB::transaction(function () use ($project, $graphData, $request) {
            return ProjectSnapshot::create([
                'project_id'    => $project->id,
                'graph_data'    => $graphData,
                'compiled_html' => $this->sanitizeHtml($request->input('compiled_html')),
                'compiled_css'  => $request->input('compiled_css'),
                'compiled_js'   => $request->input('compiled_js'),
                'version'       => ProjectSnapshot::nextVersion($project->id),
                'created_at'    => now(),
            ]);
        });

        return response()->json([
            'success' => true,
            'data'    => new SnapshotResource($snapshot),
        ], 201);
    }

    /**
     * Minimal server-side HTML sanitization.
     *
     * The VSB compiler runs client-side and is trusted for now, so this
     * is a lightweight pass — strip <script> injections that didn't come
     * from jsFile/jsEvent nodes, and normalize encoding.
     *
     * Extend this method (or swap in an HTMLPurifier instance) when
     * multi-tenant isolation or user-generated content becomes a concern.
     */
    private function sanitizeHtml(string $html): string
    {
        // Remove any <script> tags that weren't produced by the VSB compiler.
        // The compiler injects JS via a dedicated <script id="vsb-js"> tag —
        // any other script blocks are unexpected and stripped.
        $html = preg_replace(
            '/<script(?![^>]*id=["\']vsb-js["\'])[^>]*>.*?<\/script>/is',
            '',
            $html
        );

        return $html;
    }
}
