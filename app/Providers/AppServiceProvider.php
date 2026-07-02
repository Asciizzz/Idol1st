<?php

namespace App\Providers;

use App\Events\BlogPostPublished;
use App\Listeners\SendBlogPostPublishedNotification;
use App\Models\Asset;
use App\Models\Project;
use App\Policies\AssetPolicy;
use App\Policies\ProjectPolicy;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Event;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}
    public function boot(): void {
        Gate::policy(Project::class, ProjectPolicy::class);
        Gate::policy(Asset::class, AssetPolicy::class);

        Event::listen(BlogPostPublished::class, SendBlogPostPublishedNotification::class);
    }
}
