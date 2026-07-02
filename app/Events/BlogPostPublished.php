<?php

namespace App\Events;

use App\Models\BlogPost;
use App\Models\Tenant;

class BlogPostPublished
{
    public function __construct(
        public readonly Tenant $tenant,
        public readonly BlogPost $post,
    ) {
    }
}
