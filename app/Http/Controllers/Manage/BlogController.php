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
use App\Services\Manage\BlogWorkflowService;

class BlogController extends Controller
{
    public function __construct(private BlogWorkflowService $blogWorkflowService)
    {
    }

    /**
     * GET /api/manage/blog/posts
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = app(Tenant::class);

        $query = BlogPost::forTenant($tenant)
            ->with('category');

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
        $post = $this->blogWorkflowService->createPost($tenant, $request->validated());

        return response()->json([
            'success' => true,
            'data'    => new BlogPostResource($post),
        ], 201);
    }

    /**
     * POST /api/manage/blog/posts/{postId}/publish
     */
    public function publish(string $postId): JsonResponse
    {
        $tenant = app(Tenant::class);
        $post = $this->blogWorkflowService->publishPost($tenant, $postId);

        return response()->json([
            'success' => true,
            'data'    => new BlogPostResource($post),
        ]);
    }

    /**
     * POST /api/manage/blog/comments/{commentId}/hide
     */
    public function hideComment(string $commentId): JsonResponse
    {
        $tenant = app(Tenant::class);
        $comment = $this->blogWorkflowService->hideComment($tenant, $commentId);

        return response()->json([
            'success' => true,
            'data'    => new BlogCommentResource($comment),
        ]);
    }
}
