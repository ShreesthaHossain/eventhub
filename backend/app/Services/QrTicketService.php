<?php

namespace App\Services;

use App\Models\EventTicket;
use App\Models\Registration;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\Writer\SvgWriter;
use Illuminate\Support\Str;

class QrTicketService
{
    public function ensureTicket(Registration $registration): EventTicket
    {
        $existing = $registration->ticket;
        if ($existing) {
            return $existing;
        }

        return EventTicket::create([
            'registration_id' => $registration->id,
            'token' => Str::lower(Str::random(48)),
            'expires_at' => $registration->event->end_at,
        ]);
    }

    public function qrSvgForToken(string $token): string
    {
        $payload = json_encode(['t' => $token, 'v' => 1], JSON_THROW_ON_ERROR);

        $builder = new Builder(
            writer: new SvgWriter,
            data: $payload,
            encoding: new Encoding('UTF-8'),
            errorCorrectionLevel: ErrorCorrectionLevel::Medium,
            size: 280,
            margin: 8,
        );

        $result = $builder->build();

        return $result->getString();
    }
}
