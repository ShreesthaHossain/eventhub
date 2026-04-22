<?php

namespace App\Providers;

use App\Models\Attendance;
use App\Models\Event;
use App\Models\Sponsorship;
use App\Policies\AttendancePolicy;
use App\Policies\EventPolicy;
use App\Policies\SponsorshipPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Gate::policy(Event::class, EventPolicy::class);
        Gate::policy(Sponsorship::class, SponsorshipPolicy::class);
        Gate::policy(Attendance::class, AttendancePolicy::class);
    }
}
