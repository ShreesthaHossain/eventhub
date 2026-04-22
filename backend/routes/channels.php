<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Public channel — no auth required, anyone viewing an event detail page subscribes
Broadcast::channel('event.{eventId}', fn () => true);
