<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Registration;
use App\Services\QrTicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketController extends Controller
{
    public function __construct(
        private QrTicketService $qrTickets
    ) {}

    public function show(Request $request, Event $event): JsonResponse
    {
        $registration = Registration::query()
            ->where('event_id', $event->id)
            ->where('user_id', $request->user()->id)
            ->where('status', Registration::STATUS_REGISTERED)
            ->firstOrFail();

        $ticket = $this->qrTickets->ensureTicket($registration->load('event'));

        $payload = json_encode(['t' => $ticket->token, 'v' => 1], JSON_THROW_ON_ERROR);
        $svg = $this->qrTickets->qrSvgForToken($ticket->token);

        return response()->json([
            'token' => $ticket->token,
            'payload' => $payload,
            'qr_svg' => $svg,
            'expires_at' => $ticket->expires_at,
        ]);
    }
}
