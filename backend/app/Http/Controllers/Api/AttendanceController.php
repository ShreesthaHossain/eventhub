<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Event;
use App\Models\EventTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function scan(Request $request): JsonResponse
    {
        $this->authorize('scan', \App\Models\Attendance::class);

        $data = $request->validate([
            'payload' => ['required', 'string'],
        ]);

        $decoded = json_decode($data['payload'], true);
        if (! is_array($decoded) || empty($decoded['t'])) {
            return response()->json(['message' => 'Invalid QR payload.'], 422);
        }

        $token = $decoded['t'];

        $ticket = EventTicket::query()->where('token', $token)->first();
        if (! $ticket) {
            return response()->json(['message' => 'Ticket not found.'], 404);
        }

        $registration = $ticket->registration()->with('event')->firstOrFail();
        $event = $registration->event;

        // Organizers may only scan for their own events; admins scan all (handled by policy before())
        if ($request->user()->hasRole('organizer') && $event->organizer_id !== $request->user()->id) {
            abort(403);
        }

        if ($ticket->used_at) {
            return response()->json(['message' => 'Ticket already used.', 'attendee' => $registration->user_id], 422);
        }

        if ($ticket->expires_at && $ticket->expires_at->isPast()) {
            return response()->json(['message' => 'Ticket expired.'], 422);
        }

        Attendance::query()->firstOrCreate(
            [
                'event_id' => $event->id,
                'user_id' => $registration->user_id,
            ],
            [
                'checked_in_at' => now(),
                'method' => 'qr',
                'marked_by' => $request->user()->id,
            ]
        );

        $ticket->update(['used_at' => now()]);

        return response()->json(['message' => 'Checked in.', 'event_id' => $event->id]);
    }

    public function forEvent(Request $request, Event $event): JsonResponse
    {
        $this->authorize('viewForEvent', [Attendance::class, $event]);

        $rows = Attendance::query()
            ->where('event_id', $event->id)
            ->with('user:id,name,email')
            ->orderBy('checked_in_at')
            ->get();

        return response()->json(['data' => $rows]);
    }
}
