<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\User;

class AttendancePolicy
{
    public function before(User $user): ?bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return null;
    }

    /**
     * Only organizers and admins can scan QR codes.
     * Admins are covered by before(); here we allow the owning organizer.
     */
    public function scan(User $user): bool
    {
        return $user->hasRole('organizer');
    }

    /**
     * Only the owning organizer (or admin) can view the attendance list.
     */
    public function viewForEvent(User $user, Event $event): bool
    {
        return $user->hasRole('organizer') && $event->organizer_id === $user->id;
    }
}
