<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    /**
     * Platform admins can bypass checks.
     */
    public function before(User $user): ?bool
    {
        return $user->role === 'admin'
            ? true
            : null;
    }


    /**
     * Any authenticated tenant user can create projects.
     */
    public function create(User $user): bool
    {
        return $user->tenant_id !== null;
    }


    /**
     * User can access projects inside their tenant.
     */
    public function view(User $user, Project $project): bool
    {
        return $user->tenant_id === $project->tenant_id;
    }


    /**
     * Update allowed for tenant users.
     */
    public function update(User $user, Project $project): bool
    {
        return $user->tenant_id === $project->tenant_id;
    }


    /**
     * Delete allowed for tenant users.
     */
    public function delete(User $user, Project $project): bool
    {
        return $user->tenant_id === $project->tenant_id;
    }
}
