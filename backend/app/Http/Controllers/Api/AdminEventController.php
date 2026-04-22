<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventApprovalLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminEventController extends Controller
{
    public function pending(Request $request): JsonResponse
    {
        $this->authorize('approve', Event::class);

        $events = Event::query()
            ->where('status', Event::STATUS_PENDING)
            ->with(['organizer:id,name,email', 'category', 'venue'])
            ->orderBy('created_at')
            ->paginate(20);

        return response()->json($events);
    }

    public function approve(Request $request, Event $event): JsonResponse
    {
        $this->authorize('approve', $event);

        if ($event->status !== Event::STATUS_PENDING) {
            return response()->json(['message' => 'Event is not pending approval.'], 422);
        }

        $event->update([
            'status' => Event::STATUS_APPROVED,
            'rejection_reason' => null,
        ]);

        EventApprovalLog::create([
            'event_id' => $event->id,
            'admin_id' => $request->user()->id,
            'action' => 'approve',
            'note' => null,
        ]);

        return response()->json($event->fresh());
    }

    public function reject(Request $request, Event $event): JsonResponse
    {
        $this->authorize('reject', $event);

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        if ($event->status !== Event::STATUS_PENDING) {
            return response()->json(['message' => 'Event is not pending approval.'], 422);
        }

        $event->update([
            'status' => Event::STATUS_REJECTED,
            'rejection_reason' => $data['reason'],
        ]);

        EventApprovalLog::create([
            'event_id' => $event->id,
            'admin_id' => $request->user()->id,
            'action' => 'reject',
            'note' => $data['reason'],
        ]);

        return response()->json($event->fresh());
    }
}
