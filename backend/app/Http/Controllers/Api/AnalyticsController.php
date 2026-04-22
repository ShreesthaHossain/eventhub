<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Event;
use App\Models\Registration;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        if (! $request->user()->hasRole('admin')) {
            abort(403);
        }

        return response()->json([
            'users_total' => User::query()->count(),
            'events_total' => Event::query()->count(),
            'events_pending' => Event::query()->where('status', Event::STATUS_PENDING)->count(),
            'registrations_total' => Registration::query()->where('status', Registration::STATUS_REGISTERED)->count(),
            'attendance_total' => Attendance::query()->count(),
            'events_by_status' => Event::query()
                ->selectRaw('status, count(*) as c')
                ->groupBy('status')
                ->pluck('c', 'status'),
            'top_categories' => Event::query()
                ->selectRaw('categories.name as name, count(events.id) as c')
                ->join('categories', 'categories.id', '=', 'events.category_id')
                ->where('events.status', Event::STATUS_APPROVED)
                ->groupBy('categories.name')
                ->orderByDesc('c')
                ->limit(8)
                ->get(),
        ]);
    }
}
