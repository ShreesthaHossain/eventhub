<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventTicket;
use App\Models\Registration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class QrTicketTest extends TestCase
{
    use RefreshDatabase;

    private User $organizer;

    private User $attendee;

    private Event $event;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['admin', 'organizer', 'attendee', 'sponsor'] as $role) {
            Role::create(['name' => $role, 'guard_name' => 'web']);
        }

        $this->organizer = User::factory()->create();
        $this->organizer->assignRole('organizer');

        $this->attendee = User::factory()->create();
        $this->attendee->assignRole('attendee');

        $this->event = Event::create([
            'organizer_id' => $this->organizer->id,
            'title' => 'Scan Test Event',
            'description' => 'Desc',
            'start_at' => now()->addDay(),
            'end_at' => now()->addDays(2),
            'total_seats' => 50,
            'status' => Event::STATUS_APPROVED,
        ]);
    }

    private function registerAndGetTicket(): EventTicket
    {
        $this->actingAs($this->attendee)->postJson("/api/events/{$this->event->id}/register");

        $registration = Registration::query()
            ->where('event_id', $this->event->id)
            ->where('user_id', $this->attendee->id)
            ->firstOrFail();

        return EventTicket::query()
            ->where('registration_id', $registration->id)
            ->firstOrFail();
    }

    public function test_registering_creates_qr_ticket(): void
    {
        $this->actingAs($this->attendee)
            ->postJson("/api/events/{$this->event->id}/register")
            ->assertStatus(201);

        $registration = Registration::query()
            ->where('event_id', $this->event->id)
            ->where('user_id', $this->attendee->id)
            ->first();

        $this->assertNotNull($registration, 'Registration should exist');
        $this->assertDatabaseHas('event_tickets', ['registration_id' => $registration->id]);
    }

    public function test_ticket_endpoint_returns_qr_svg(): void
    {
        $this->actingAs($this->attendee)->postJson("/api/events/{$this->event->id}/register");

        $res = $this->actingAs($this->attendee)
            ->getJson("/api/events/{$this->event->id}/ticket");

        $res->assertOk()->assertJsonStructure(['qr_svg', 'token']);
        $this->assertStringContainsString('<svg', $res->json('qr_svg'));
    }

    public function test_organizer_can_scan_valid_qr_token(): void
    {
        $ticket = $this->registerAndGetTicket();
        $payload = json_encode(['t' => $ticket->token, 'v' => 1]);

        $res = $this->actingAs($this->organizer)
            ->postJson('/api/attendance/scan', ['payload' => $payload]);

        $res->assertOk()->assertJsonPath('message', 'Checked in.');
    }

    public function test_scanning_invalid_token_returns_error(): void
    {
        $payload = json_encode(['t' => 'totally-invalid-token', 'v' => 1]);

        $this->actingAs($this->organizer)
            ->postJson('/api/attendance/scan', ['payload' => $payload])
            ->assertStatus(404);
    }

    public function test_cannot_scan_same_token_twice(): void
    {
        $ticket = $this->registerAndGetTicket();
        $payload = json_encode(['t' => $ticket->token, 'v' => 1]);

        $this->actingAs($this->organizer)->postJson('/api/attendance/scan', ['payload' => $payload])->assertOk();
        $this->actingAs($this->organizer)
            ->postJson('/api/attendance/scan', ['payload' => $payload])
            ->assertStatus(422);
    }

    public function test_attendee_cannot_scan_qr(): void
    {
        $ticket = $this->registerAndGetTicket();
        $payload = json_encode(['t' => $ticket->token, 'v' => 1]);

        $this->actingAs($this->attendee)
            ->postJson('/api/attendance/scan', ['payload' => $payload])
            ->assertStatus(403);
    }
}
