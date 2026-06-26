<?php

namespace App\Policies;

use App\Models\Asset;
use App\Models\User;

class AssetPolicy
{
    /**
     * Admins can do anything.
     */
    public function before(User $user): ?bool
    {
        return $user->role === 'admin' ? true : null;
    }

    public function delete(User $user, Asset $asset): bool
    {
        return $user->id === $asset->user_id;
    }
}
