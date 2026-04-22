<?php

namespace App\Http\Controllers\Api;

use App\Events\EventSeatsUpdated;
use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Registration;
use App\Services\QrTicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RegistrationController extends Controller
{
    public function __construct(
        private QrTicketService $qrTickets
    ) {}

    public function store(Request $request, Event $event): JsonResponse
    {
        if ($event->status !== Event::STATUS_APPROVED) {
            return response()->json(['message' => 'This event is not open for registration.'], 422);
        }

        $user = $request->user();

        $registration = DB::transaction(function () use ($event, $user) {
            /** @var Event $locked */
            $locked = Event::query()->lockForUpdate()->findOrFail($event->id);

            if ($locked->status !== Event::STATUS_APPROVED) {
                abort(422, 'Event not available.');
            }

            $existing = Registration::query()
                ->where('event_id', $locked->id)
                ->where('user_id', $user->id)
                ->first();

            if ($existing && $existing->status !== Registration::STATUS_CANCELLED) {
                return ['registration' => $existing, 'created' => false];
            }

            $registered = Registration::query()
                ->where('event_id', $locked->id)
                ->where('status', Registration::STATUS_REGISTERED)
                ->count();

            $status = Registration::STATUS_REGISTERED;
            if ($registered >= $locked->total_seats) {
                $status = Registration::STATUS_WAITLIST;
            }

            if ($existing && $existing->status === Registration::STATUS_CANCELLED) {
                $existing->update(['status' => $status]);

                return ['registration' => $existing->fresh(), 'created' => true];
            }

            $created = Registration::create([
                'event_id' => $locked->id,
                'user_id' => $user->id,
                'status' => $status,
            ]);

            return ['registration' => $created, 'created' => true];
        });

        $reg = $registration['registration'];
        $this->qrTickets->ensureTicket($reg->load('event'));

        broadcast(new EventSeatsUpdated($event->refresh()));

        return response()->json(
            $reg->load('ticket'),
            $registration['created'] ? 201 : 200
        );
    }

    public function destroy(Request $request, Event $event): JsonResponse
    {
        $registration = Registration::query()
            ->where('event_id', $event->id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $registration->update(['status' => Registration::STATUS_CANCELLED]);

        broadcast(new EventSeatsUpdated($event->refresh()));

        return response()->json(['message' => 'Registration cancelled.']);
    }

    public function forEvent(Request $request, Event $event): JsonResponse
    {
        $user = $request->user();

        // Only the event organizer or an admin may view the registrations list
        if (! $user->hasRole('admin') && (int) $event->organizer_id !== (int) $user->id) {
            abort(403, 'Unauthorized.');
        }

        $registrations = Registration::query()
            ->where('event_id', $event->id)
            ->whereIn('status', [Registration::STATUS_REGISTERED, Registration::STATUS_WAITLIST])
            ->with('user:id,name,email')
            ->orderByRaw("CASE status WHEN 'registered' THEN 0 ELSE 1 END")
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($r) => [
                'id'            => $r->id,
                'status'        => $r->status,
                'registered_at' => $r->created_at->toIso8601String(),
                'user'          => [
                    'id'    => $r->user->id,
                    'name'  => $r->user->name,
                    'email' => $r->user->email,
                ],
            ]);

        return response()->json([
            'data'           => $registrations,
            'total_seats'    => $event->total_seats,
            'registered'     => $registrations->where('status', Registration::STATUS_REGISTERED)->count(),
            'waitlist'       => $registrations->where('status', Registration::STATUS_WAITLIST)->count(),
        ]);
    }

    public function mine(Request $request): JsonResponse
    {
        $items = Registration::query()
            ->where('user_id', $request->user()->id)
            ->with(['event.category', 'event.venue', 'ticket'])
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($items);
    }
}
