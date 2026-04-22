<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Event::query()->with(['organizer:id,name,email', 'category', 'venue']);

        // This route is public (no auth middleware), so we attempt optional Sanctum
        // token resolution ourselves — $request->user() would always return null here.
        $user = auth('sanctum')->user();
        $publicOnly = $request->boolean('public_only', true);

        if (! $user) {
            $query->where('status', Event::STATUS_APPROVED);
        } elseif ($user->hasRole('admin') && ! $publicOnly) {
            // all statuses for admin dashboard
        } elseif ($user->hasRole('organizer')) {
            $query->where(function ($q) use ($user) {
                $q->where('status', Event::STATUS_APPROVED)
                    ->orWhere('organizer_id', $user->id);
            });
        } else {
            $query->where('status', Event::STATUS_APPROVED);
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($request->filled('from')) {
            $query->where('end_at', '>=', $request->date('from')->startOfDay());
        }

        if ($request->filled('to')) {
            $query->where('start_at', '<=', $request->date('to')->endOfDay());
        }

        $events = $query->orderBy('start_at')->paginate(20);

        return response()->json($events);
    }

    public function calendar(Request $request): JsonResponse
    {
        $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
        ]);

        $items = Event::query()
            ->where('status', Event::STATUS_APPROVED)
            ->where('start_at', '<=', $request->date('to')->endOfDay())
            ->where('end_at', '>=', $request->date('from')->startOfDay())
            ->with(['category', 'venue'])
            ->orderBy('start_at')
            ->get()
            ->map(fn (Event $e) => [
                'id' => $e->id,
                'title' => $e->title,
                'start_at' => $e->start_at->toIso8601String(),
                'end_at' => $e->end_at->toIso8601String(),
                'category' => $e->category?->name,
                'venue' => $e->venue?->name,
            ]);

        return response()->json(['data' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Event::class);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'venue_id' => ['nullable', 'exists:venues,id'],
            'start_at' => ['required', 'date'],
            'end_at' => ['required', 'date', 'after:start_at'],
            'total_seats' => ['required', 'integer', 'min:0'],
        ]);

        $event = Event::create([
            ...$data,
            'organizer_id' => $request->user()->id,
            'status' => Event::STATUS_DRAFT,
        ]);

        return response()->json($event->load(['category', 'venue']), 201);
    }

    public function show(Request $request, Event $event): JsonResponse
    {
        if ($event->status !== Event::STATUS_APPROVED) {
            $user = $request->user();
            if (! $user || (! $user->hasRole('admin') && $event->organizer_id !== $user->id)) {
                abort(404);
            }
        }

        $event->load(['organizer:id,name,email', 'category', 'venue']);

        return response()->json([
            'event' => $event,
            'seats_remaining' => $event->seatsRemaining(),
            'registered_count' => $event->registeredCount(),
        ]);
    }

    public function update(Request $request, Event $event): JsonResponse
    {
        $this->authorize('update', $event);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'venue_id' => ['nullable', 'exists:venues,id'],
            'start_at' => ['sometimes', 'date'],
            'end_at' => ['sometimes', 'date', 'after:start_at'],
            'total_seats' => ['sometimes', 'integer', 'min:0'],
        ]);

        if (in_array($event->status, [Event::STATUS_APPROVED, Event::STATUS_PENDING], true)) {
            unset($data['start_at'], $data['end_at'], $data['total_seats']);
        }

        $event->update($data);

        return response()->json($event->fresh()->load(['category', 'venue']));
    }

    public function destroy(Request $request, Event $event): JsonResponse
    {
        $this->authorize('delete', $event);
        $event->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    public function submit(Request $request, Event $event): JsonResponse
    {
        $this->authorize('submit', $event);

        if ($event->status !== Event::STATUS_DRAFT) {
            return response()->json(['message' => 'Only draft events can be submitted.'], 422);
        }

        $event->update(['status' => Event::STATUS_PENDING]);

        return response()->json($event);
    }
}
