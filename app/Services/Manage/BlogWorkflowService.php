<?php

namespace App\Services\Manage;

use App\Models\BlogComment;
use App\Models\BlogPost;
use App\Models\Tenant;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BlogWorkflowService
{
    public function createPost(Tenant $tenant, array $data): BlogPost
    {
        $status = $data['status'] ?? 'DRAFT';
        $publishedAt = null;

        if ($status === 'PUBLISHED') {
            $publishedAt = ! empty($data['publish_at']) ? $data['publish_at'] : now();
        }

        return BlogPost::create([
            'id'           => Str::uuid(),
            'tenant_id'    => $tenant->id,
            'category_id'  => $data['category_id'] ?? null,
            'title'        => $data['title'],
            'content'      => $data['content'],
            'tags'         => $data['tags'] ?? [],
            'visibility'   => $data['visibility'] ?? 'PUBLIC',
            'status'       => $status,
            'published_at' => $publishedAt,
        ])->load('category');
    }

    public function publishPost(Tenant $tenant, string $postId): BlogPost
    {
        $post = BlogPost::forTenant($tenant)->findOrFail($postId);

        $post->update([
            'status'       => 'PUBLISHED',
            'published_at' => $post->published_at ?? now(),
        ]);

        app(NotificationService::class)->broadcast(
            $tenant,
            'NEW_POST',
            "New post: {$post->title}",
            $post->id,
            'BlogPost',
        );

        return $post->fresh('category');
    }

    public function hideComment(Tenant $tenant, string $commentId): BlogComment
    {
        $comment = BlogComment::whereHas('post', fn ($query) => $query->forTenant($tenant))
            ->findOrFail($commentId);

        $comment->update(['is_hidden' => true]);

        return $comment->fresh();
    }
}
