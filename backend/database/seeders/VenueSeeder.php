<?php

namespace Database\Seeders;

use App\Models\Venue;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class VenueSeeder extends Seeder
{
    public function run(): void
    {
        // Remove venue references from events first, then wipe
        DB::statement('UPDATE events SET venue_id = NULL');
        DB::table('venues')->truncate();

        $venues = [
            'Student Lounge',
            'Conference Hall',
            'Shadhinota Shommelon',
            'Ground Field 1',
            'Ground Field 2',
            'Meeting Room',
            'Innovation Lab',
        ];

        foreach ($venues as $name) {
            Venue::create(['name' => $name, 'address' => '', 'capacity' => 0]);
        }
    }
}
