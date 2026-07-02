<?php

namespace App\Listeners;

use App\Events\BlogPostPublished;
use App\Services\NotificationService;

class SendBlogPostPublishedNotification
{
    public function __construct(private NotificationService $notificationService)
    {
    }

    public function handle(BlogPostPublished $event): void
    {
        $this->notificationService->broadcast(
            $event->tenant,
            'NEW_POST',
            "New post: {$event->post->title}",
            $event->post->id,
            'BlogPost',
        );
    }
}
