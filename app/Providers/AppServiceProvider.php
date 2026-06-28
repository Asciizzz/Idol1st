<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

use App\Models\Project;
use App\Policies\ProjectPolicy;
use Illuminate\Support\Facades\Gate;

use App\Models\Asset;
use App\Policies\AssetPolicy;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}
    public function boot(): void {
        Gate::policy(Project::class, ProjectPolicy::class);
        Gate::policy(Asset::class, AssetPolicy::class);
    }
}
