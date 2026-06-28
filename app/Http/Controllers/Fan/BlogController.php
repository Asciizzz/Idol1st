<?php

namespace App\Http\Controllers\Fan;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fan\StoreBlogCommentRequest;
use App\Http\Resources\BlogCommentResource;
use App\Http\Resources\BlogPostResource;
use App\Models\BlogComment;
use App\Models\BlogPost;
use App\Models\BlogPostLike;
use App\Models\Fan;
use App\Models\Tenant;
use App\Services\VisibilityGateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BlogController extends Controller
{
    public function __construct(private VisibilityGateService $gate) {}

    /**
     * GET /api/blog/posts
     *
     * Lists PUBLISHED posts for the tenant.
     * Gated content is included in listing (title/meta visible)
     * but full content is withheld — fans know what they're missing.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = app(Tenant::class);
        $fan    = $this->resolveFan($request);

        $query = BlogPost::with('category')
            ->where('tenant_id', $tenant->id)
            ->where('status', 'PUBLISHED')
            ->latest('published_at');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('tag')) {
            $query->whereJsonContains('tags', $request->tag);
        }

        $posts = $query->paginate($request->input('per_page', 20));

        // Apply visibility gate — strip content from gated posts the fan can't access
        $posts->getCollection()->transform(function (BlogPost $post) use ($fan) {
            if (! $this->gate->canView($fan, $post->visibility)) {
                $post->content = null; // withhold body, keep title/meta
            }
            return $post;
        });

        return response()->json([
            'success' => true,
            'data'    => BlogPostResource::collection($posts),
            'meta'    => [
                'current_page' => $posts->currentPage(),
                'per_page'     => $posts->perPage(),
                'total'        => $posts->total(),
                'last_page'    => $posts->lastPage(),
            ],
        ]);
    }

    /**
     * GET /api/blog/posts/{postId}
     *
     * Full post — 403 if fan can't access gated content.
     */
    public function show(Request $request, string $postId): JsonResponse
    {
        $tenant = app(Tenant::class);
        $fan    = $this->resolveFan($request);

        $post = BlogPost::with('category')
            ->where('tenant_id', $tenant->id)
            ->where('status', 'PUBLISHED')
            ->findOrFail($postId);

        if (! $this->gate->canView($fan, $post->visibility)) {
            return response()->json([
                'success' => false,
                'message' => $this->gate->gateMessage($post->visibility),
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data'    => new BlogPostResource($post),
        ]);
    }

    /**
     * POST /api/blog/posts/{postId}/like
     *
     * Toggle like — creates or deletes the like record.
     */
    public function like(Request $request, string $postId): JsonResponse
    {
        $tenant = app(Tenant::class);
        $fan    = $this->resolveFan($request);

        $post = BlogPost::where('tenant_id', $tenant->id)
            ->where('status', 'PUBLISHED')
            ->findOrFail($postId);

        $existing = BlogPostLike::where('post_id', $post->id)
            ->where('fan_id', $fan->id)
            ->first();

        if ($existing) {
            $existing->delete();
            $liked = false;
        } else {
            BlogPostLike::create(['post_id' => $post->id, 'fan_id' => $fan->id]);
            $liked = true;
        }

        return response()->json([
            'success'    => true,
            'liked'      => $liked,
            'like_count' => $post->likes()->count(),
        ]);
    }

    /**
     * GET /api/blog/posts/{postId}/comments
     */
    public function comments(Request $request, string $postId): JsonResponse
    {
        $tenant = app(Tenant::class);

        $post = BlogPost::where('tenant_id', $tenant->id)
            ->where('status', 'PUBLISHED')
            ->findOrFail($postId);

        $comments = BlogComment::where('post_id', $post->id)
            ->where('is_hidden', false)
            ->latest()
            ->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data'    => BlogCommentResource::collection($comments),
            'meta'    => [
                'current_page' => $comments->currentPage(),
                'per_page'     => $comments->perPage(),
                'total'        => $comments->total(),
                'last_page'    => $comments->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/blog/posts/{postId}/comments
     */
    public function storeComment(StoreBlogCommentRequest $request, string $postId): JsonResponse
    {
        $tenant = app(Tenant::class);
        $fan    = $this->resolveFan($request);

        $post = BlogPost::where('tenant_id', $tenant->id)
            ->where('status', 'PUBLISHED')
            ->findOrFail($postId);

        $comment = BlogComment::create([
            'id'      => Str::uuid(),
            'post_id' => $post->id,
            'fan_id'  => $fan->id,
            'content' => $request->content,
        ]);

        return response()->json([
            'success' => true,
            'data'    => new BlogCommentResource($comment),
        ], 201);
    }

    /**
     * Resolve the authenticated fan from the request, or return null for guests.
     */
    private function resolveFan(Request $request): ?Fan
    {
        $user = $request->user('sanctum');
        return $user instanceof Fan ? $user : null;
    }
}
