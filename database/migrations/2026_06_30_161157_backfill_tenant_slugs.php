<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $tenants = DB::table('tenants')->get();

        foreach ($tenants as $tenant) {

            // only update empty slug
            if (empty($tenant->slug)) {

                DB::table('tenants')
                    ->where('id', $tenant->id)
                    ->update([
                        'slug' => Str::slug(
                            str_replace(
                                ' Fan Site',
                                '',
                                $tenant->name
                            )
                        ),
                        'updated_at' => now(),
                    ]);
            }
        }
    }


    public function down(): void
    {
        DB::table('tenants')
            ->update([
                'slug' => '',
            ]);
    }
};
