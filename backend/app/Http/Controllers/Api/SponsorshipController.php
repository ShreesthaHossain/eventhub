<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Sponsorship;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SponsorshipController extends Controller
{
    /**
     * Sponsor: list my sponsorships (all events).
     */
    public function mine(Request $request): JsonResponse
    {
        $items = Sponsorship::query()
            ->where('sponsor_id', $request->user()->id)
            ->with(['event.category', 'event.venue'])
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($items);
    }

    /**
     * Sponsor: apply to sponsor an event.
     */
    public function store(Request $request, Event $event): JsonResponse
    {
        $this->authorize('create', Sponsorship::class);

        if ($event->status !== Event::STATUS_APPROVED) {
            return response()->json(['message' => 'You can only sponsor approved events.'], 422);
        }

        $data = $request->validate([
            'tier' => ['required', 'string', 'in:'.implode(',', Sponsorship::TIERS)],
            'amount' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $existing = Sponsorship::query()
            ->where('event_id', $event->id)
            ->where('sponsor_id', $request->user()->id)
            ->first();

        if ($existing && $existing->status !== Sponsorship::STATUS_REJECTED) {
            return response()->json(['message' => 'You already have an active sponsorship application for this event.'], 422);
        }

        if ($existing) {
            $existing->update([...$data, 'status' => Sponsorship::STATUS_PENDING]);

            return response()->json($existing->fresh()->load('event'), 200);
        }

        $sponsorship = Sponsorship::create([
            ...$data,
            'event_id' => $event->id,
            'sponsor_id' => $request->user()->id,
            'status' => Sponsorship::STATUS_PENDING,
        ]);

        return response()->json($sponsorship->load('event'), 201);
    }

    /**
     * Sponsor: update tier/amount/notes while still pending.
     */
    public function update(Request $request, Sponsorship $sponsorship): JsonResponse
    {
        $this->authorize('update', $sponsorship);

        $data = $request->validate([
            'tier' => ['sometimes', 'string', 'in:'.implode(',', Sponsorship::TIERS)],
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $sponsorship->update($data);

        return response()->json($sponsorship->fresh()->load('event'));
    }

    /**
     * Sponsor: withdraw (cancel) a pending sponsorship.
     */
    public function destroy(Request $request, Sponsorship $sponsorship): JsonResponse
    {
        $this->authorize('delete', $sponsorship);

        $sponsorship->delete();

        return response()->json(['message' => 'Sponsorship withdrawn.']);
    }

    // ─── Admin / Organizer actions ────────────────────────────────────────────

    /**
     * Organizer/admin: list sponsorships for a specific event.
     */
    public function indexForEvent(Request $request, Event $event): JsonResponse
    {
        $this->authorize('viewForEvent', [Sponsorship::class, $event]);

        $items = $event->sponsorships()->with('sponsor:id,name,email')->paginate(20);

        return response()->json($items);
    }

    /**
     * Admin: approve or reject a sponsorship application.
     */
    public function review(Request $request, Sponsorship $sponsorship): JsonResponse
    {
        $this->authorize('review', $sponsorship);

        $data = $request->validate([
            'status' => ['required', 'string', 'in:approved,rejected'],
        ]);

        $sponsorship->update($data);

        return response()->json($sponsorship->fresh()->load(['event', 'sponsor:id,name,email']));
    }
}
