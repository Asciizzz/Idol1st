<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // assign tenant_id from user
        DB::table('projects')
            ->join('users', 'users.id', '=', 'projects.user_id')
            ->update([
                'projects.tenant_id' => DB::raw('users.tenant_id')
            ]);
    }

    public function down(): void
    {
        DB::table('projects')->update([
            'tenant_id' => null
        ]);
    }
};
