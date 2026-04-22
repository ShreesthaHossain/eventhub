<?php

namespace App\Policies;

use App\Models\Sponsorship;
use App\Models\User;

class SponsorshipPolicy
{
    public function before(User $user): ?bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return null;
    }

    /**
     * Only users with the sponsor role can apply for sponsorships.
     */
    public function create(User $user): bool
    {
        return $user->hasRole('sponsor');
    }

    /**
     * A sponsor can edit their own pending application.
     */
    public function update(User $user, Sponsorship $sponsorship): bool
    {
        return $user->hasRole('sponsor')
            && $sponsorship->sponsor_id === $user->id
            && $sponsorship->status === Sponsorship::STATUS_PENDING;
    }

    /**
     * A sponsor can withdraw their own application; admin can remove any.
     */
    public function delete(User $user, Sponsorship $sponsorship): bool
    {
        return $sponsorship->sponsor_id === $user->id;
    }

    /**
     * Only admins can review (approve/reject) sponsorships — covered by before().
     */
    public function review(User $user): bool
    {
        return false;
    }

    /**
     * Organizer can view sponsorships for their own events; admin sees all.
     */
    public function viewForEvent(User $user, \App\Models\Event $event): bool
    {
        return $user->hasRole('organizer') && $event->organizer_id === $user->id;
    }
}
