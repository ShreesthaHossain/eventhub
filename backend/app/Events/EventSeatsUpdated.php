<?php

namespace App\Events;

use App\Models\Event;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EventSeatsUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $eventId;

    public int $seatsRemaining;

    public int $registeredCount;

    public int $totalSeats;

    public function __construct(Event $event)
    {
        $this->eventId = $event->id;
        $this->seatsRemaining = $event->seatsRemaining();
        $this->registeredCount = $event->registeredCount();
        $this->totalSeats = (int) $event->total_seats;
    }

    /**
     * Broadcast on a public channel so unauthenticated viewers also get updates.
     */
    public function broadcastOn(): array
    {
        return [
            new Channel("event.{$this->eventId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'seats.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'event_id' => $this->eventId,
            'seats_remaining' => $this->seatsRemaining,
            'registered_count' => $this->registeredCount,
            'total_seats' => $this->totalSeats,
        ];
    }
}
