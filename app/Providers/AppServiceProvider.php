<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

use App\Models\Project;
use App\Policies\ProjectPolicy;
use Illuminate\Support\Facades\Gate;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}
    public function boot(): void {
        Gate::policy(Project::class, ProjectPolicy::class);
    }
}
