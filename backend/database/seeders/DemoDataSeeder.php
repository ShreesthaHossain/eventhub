<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Event;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        /* ── Categories ───────────────────────────────────────── */
        $categoryData = [
            ['slug' => 'workshops',          'name' => 'Workshops'],
            ['slug' => 'sports',             'name' => 'Sports'],
            ['slug' => 'technology',         'name' => 'Technology'],
            ['slug' => 'hackathons',         'name' => 'Hackathons'],
            ['slug' => 'arts-culture',       'name' => 'Arts & Culture'],
            ['slug' => 'music',              'name' => 'Music & Concerts'],
            ['slug' => 'career',             'name' => 'Career & Networking'],
            ['slug' => 'health-wellness',    'name' => 'Health & Wellness'],
            ['slug' => 'science',            'name' => 'Science & Research'],
            ['slug' => 'business',           'name' => 'Business & Entrepreneurship'],
            ['slug' => 'social',             'name' => 'Social & Community'],
            ['slug' => 'gaming',             'name' => 'Gaming & Esports'],
            ['slug' => 'food-drink',         'name' => 'Food & Drink'],
            ['slug' => 'volunteering',       'name' => 'Volunteering & Charity'],
            ['slug' => 'academic',           'name' => 'Academic & Lectures'],
            ['slug' => 'religious',          'name' => 'Religious & Spiritual'],
            ['slug' => 'outdoor',            'name' => 'Outdoor & Adventure'],
            ['slug' => 'film-media',         'name' => 'Film & Media'],
            ['slug' => 'language-culture',   'name' => 'Language & Culture'],
            ['slug' => 'politics-debate',    'name' => 'Politics & Debate'],
        ];

        $categories = [];
        foreach ($categoryData as $cat) {
            $categories[$cat['slug']] = Category::query()->firstOrCreate(
                ['slug' => $cat['slug']],
                ['name' => $cat['name']]
            );
        }

        /* ── Venues ───────────────────────────────────────────── */
        $venueNames = [
            'Student Lounge',
            'Conference Hall',
            'Shadhinota Shommelon',
            'Ground Field 1',
            'Ground Field 2',
            'Meeting Room',
            'Innovation Lab',
        ];

        $venues = [];
        foreach ($venueNames as $name) {
            $venues[$name] = Venue::query()->firstOrCreate(
                ['name' => $name],
                ['address' => '', 'capacity' => 0]
            );
        }

        $hall = $venues['Conference Hall'];

        $organizer = User::query()->firstOrCreate(
            ['email' => 'organizer@eventhub.local'],
            [
                'name' => 'Demo Organizer',
                'password' => Hash::make('password'),
            ]
        );
        if (! $organizer->hasRole('organizer')) {
            $organizer->assignRole('organizer');
        }

        /* ── Demo events ──────────────────────────────────────── */
        $demoEvents = [
            [
                'title'       => 'Welcome Week Meet & Greet',
                'category'    => 'social',
                'venue'       => 'Student Lounge',
                'description' => 'Meet other students and learn about campus clubs.',
                'days'        => 3,  'start_h' => 14, 'end_h' => 16,
                'seats'       => 120, 'status' => Event::STATUS_APPROVED,
            ],
            [
                'title'       => 'Basketball Intramural Signup',
                'category'    => 'sports',
                'venue'       => 'Ground Field 1',
                'description' => 'Register your team for the spring league.',
                'days'        => 5,  'start_h' => 18, 'end_h' => 20,
                'seats'       => 40, 'status' => Event::STATUS_APPROVED,
            ],
            [
                'title'       => 'Annual Tech Hackathon',
                'category'    => 'hackathons',
                'venue'       => 'Innovation Lab',
                'description' => '24-hour coding challenge. Form a team of up to 4 and build something amazing.',
                'days'        => 10, 'start_h' => 9,  'end_h' => 10,
                'seats'       => 80, 'status' => Event::STATUS_APPROVED,
            ],
            [
                'title'       => 'Career Fair — Tech Edition',
                'category'    => 'career',
                'venue'       => 'Conference Hall',
                'description' => 'Meet recruiters from 30+ companies. Bring your CV.',
                'days'        => 12, 'start_h' => 10, 'end_h' => 17,
                'seats'       => 200, 'status' => Event::STATUS_APPROVED,
            ],
            [
                'title'       => 'Open Mic Night',
                'category'    => 'music',
                'venue'       => 'Shadhinota Shommelon',
                'description' => 'Show off your talent — singing, poetry, comedy, anything goes.',
                'days'        => 7,  'start_h' => 19, 'end_h' => 22,
                'seats'       => 200, 'status' => Event::STATUS_APPROVED,
            ],
            [
                'title'       => 'Intro to Machine Learning Workshop',
                'category'    => 'technology',
                'venue'       => 'Meeting Room',
                'description' => 'Hands-on workshop covering ML fundamentals with Python and scikit-learn.',
                'days'        => 8,  'start_h' => 13, 'end_h' => 16,
                'seats'       => 60, 'status' => Event::STATUS_APPROVED,
            ],
            [
                'title'       => 'Student Art Exhibition',
                'category'    => 'arts-culture',
                'venue'       => 'Conference Hall',
                'description' => 'Annual showcase of student artwork — paintings, sculpture, digital art.',
                'days'        => 15, 'start_h' => 11, 'end_h' => 18,
                'seats'       => 150, 'status' => Event::STATUS_APPROVED,
            ],
            [
                'title'       => 'Entrepreneurship Panel: Startup Stories',
                'category'    => 'business',
                'venue'       => 'Meeting Room',
                'description' => 'Founders from 5 local startups share their journey from idea to product.',
                'days'        => 20, 'start_h' => 15, 'end_h' => 17,
                'seats'       => 50, 'status' => Event::STATUS_PENDING,
            ],
        ];

        foreach ($demoEvents as $ev) {
            Event::query()->firstOrCreate(
                ['title' => $ev['title']],
                [
                    'organizer_id' => $organizer->id,
                    'category_id'  => $categories[$ev['category']]->id,
                    'venue_id'     => $venues[$ev['venue']]->id,
                    'description'  => $ev['description'],
                    'start_at'     => now()->addDays($ev['days'])->setTime($ev['start_h'], 0),
                    'end_at'       => now()->addDays($ev['days'])->setTime($ev['end_h'] > $ev['start_h'] ? $ev['end_h'] : $ev['start_h'] + 1, 0),
                    'total_seats'  => $ev['seats'],
                    'status'       => $ev['status'],
                ]
            );
        }
    }
}
