<?php

namespace App\Http\Controllers\Manage;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manage\StoreBlogPostRequest;
use App\Http\Resources\BlogCommentResource;
use App\Http\Resources\BlogPostResource;
use App\Models\BlogComment;
use App\Models\BlogPost;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BlogController extends Controller
{
    /**
     * GET /api/manage/blog/posts
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = app(Tenant::class);

        $query = BlogPost::with('category')
            ->where('tenant_id', $tenant->id);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $posts = $query->latest()->paginate($request->input('per_page', 20));

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
     * POST /api/manage/blog/posts
     */
    public function store(StoreBlogPostRequest $request): JsonResponse
    {
        $tenant = app(Tenant::class);

        $status      = $request->input('status', 'DRAFT');
        $publishedAt = null;

        if ($status === 'PUBLISHED') {
            $publishedAt = $request->filled('publish_at')
                ? $request->publish_at
                : now();
        }

        $post = BlogPost::create([
            'id'          => Str::uuid(),
            'tenant_id'   => $tenant->id,
            'category_id' => $request->category_id,
            'title'       => $request->title,
            'content'     => $request->content,
            'tags'        => $request->input('tags', []),
            'visibility'  => $request->input('visibility', 'PUBLIC'),
            'status'      => $status,
            'published_at'=> $publishedAt,
        ]);

        return response()->json([
            'success' => true,
            'data'    => new BlogPostResource($post->load('category')),
        ], 201);
    }

    /**
     * POST /api/manage/blog/posts/{postId}/publish
     */
    public function publish(string $postId): JsonResponse
    {
        $tenant = app(Tenant::class);

        $post = BlogPost::where('tenant_id', $tenant->id)
            ->findOrFail($postId);

        $post->update([
            'status'       => 'PUBLISHED',
            'published_at' => $post->published_at ?? now(),
        ]);

        return response()->json([
            'success' => true,
            'data'    => new BlogPostResource($post->fresh('category')),
        ]);
    }

    /**
     * POST /api/manage/blog/comments/{commentId}/hide
     */
    public function hideComment(string $commentId): JsonResponse
    {
        $tenant = app(Tenant::class);

        // Ensure the comment belongs to a post in this tenant
        $comment = BlogComment::whereHas('post', fn ($q) => $q->where('tenant_id', $tenant->id))
            ->findOrFail($commentId);

        $comment->update(['is_hidden' => true]);

        return response()->json([
            'success' => true,
            'data'    => new BlogCommentResource($comment->fresh()),
        ]);
    }
}
