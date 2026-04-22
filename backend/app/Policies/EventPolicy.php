<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\User;

class EventPolicy
{
    /**
     * Admins pass every policy check automatically.
     */
    public function before(User $user): ?bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return null;
    }

    /**
     * Only organizers can create events.
     */
    public function create(User $user): bool
    {
        return $user->hasRole('organizer');
    }

    /**
     * The organizer who owns the event can update it (while draft/rejected).
     * Admins are already covered by before().
     */
    public function update(User $user, Event $event): bool
    {
        return $user->hasRole('organizer') && $event->organizer_id === $user->id;
    }

    /**
     * Same as update — only the owning organizer (or admin) can delete.
     */
    public function delete(User $user, Event $event): bool
    {
        return $user->hasRole('organizer') && $event->organizer_id === $user->id;
    }

    /**
     * The owning organizer can submit a draft for review.
     */
    public function submit(User $user, Event $event): bool
    {
        return $user->hasRole('organizer') && $event->organizer_id === $user->id;
    }

    /**
     * Only admins can approve — covered by before().
     */
    public function approve(User $user): bool
    {
        return false;
    }

    /**
     * Only admins can reject — covered by before().
     */
    public function reject(User $user): bool
    {
        return false;
    }

    /**
     * Organizers and admins can view the attendance list for an event.
     */
    public function viewAttendance(User $user, Event $event): bool
    {
        return $user->hasRole('organizer') && $event->organizer_id === $user->id;
    }
}
