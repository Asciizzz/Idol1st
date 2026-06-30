<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    public function up(): void
    {
        $admins = DB::table('tenant_admins')->get();

        foreach ($admins as $admin) {
            DB::table('users')->updateOrInsert(
                ['email' => $admin->email],
                [
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'password' => $admin->password, // already hashed
                    'tenant_id' => $admin->tenant_id,
                    'role' => 'admin',
                    'is_tenant_admin' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }

    public function down(): void
    {
        // rollback: mark migrated users only (safe rollback approach)
        DB::table('users')
            ->where('is_tenant_admin', true)
            ->update([
                'tenant_id' => null,
                'is_tenant_admin' => false,
                'role' => 'editor',
            ]);
    }
};
