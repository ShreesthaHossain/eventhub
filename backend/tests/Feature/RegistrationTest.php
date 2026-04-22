<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Registration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event as EventFacade;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    private User $organizer;

    private User $attendee;

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

        // Suppress broadcasting side-effects in tests
        EventFacade::fake();
    }

    private function makeApprovedEvent(int $seats = 10): Event
    {
        return Event::create([
            'organizer_id' => $this->organizer->id,
            'title' => 'Test Event',
            'description' => 'Desc',
            'start_at' => now()->addDay(),
            'end_at' => now()->addDays(2),
            'total_seats' => $seats,
            'status' => Event::STATUS_APPROVED,
        ]);
    }

    public function test_attendee_can_register_for_approved_event(): void
    {
        $event = $this->makeApprovedEvent(5);

        $this->actingAs($this->attendee)
            ->postJson("/api/events/{$event->id}/register")
            ->assertStatus(201)
            ->assertJsonPath('status', Registration::STATUS_REGISTERED);
    }

    public function test_registration_on_unapproved_event_fails(): void
    {
        $event = $this->makeApprovedEvent(5);
        $event->update(['status' => Event::STATUS_DRAFT]);

        $this->actingAs($this->attendee)
            ->postJson("/api/events/{$event->id}/register")
            ->assertStatus(422);
    }

    public function test_duplicate_registration_returns_existing_record(): void
    {
        $event = $this->makeApprovedEvent(5);

        $this->actingAs($this->attendee)->postJson("/api/events/{$event->id}/register");
        $res = $this->actingAs($this->attendee)->postJson("/api/events/{$event->id}/register");

        $res->assertStatus(200); // 200 = already registered, not 201
        $this->assertDatabaseCount('registrations', 1);
    }

    public function test_full_event_puts_new_registrant_on_waitlist(): void
    {
        $event = $this->makeApprovedEvent(1);

        // Fill the one seat
        $first = User::factory()->create();
        $first->assignRole('attendee');
        Registration::create([
            'event_id' => $event->id,
            'user_id' => $first->id,
            'status' => Registration::STATUS_REGISTERED,
        ]);

        // Second registrant should land on waitlist
        $this->actingAs($this->attendee)
            ->postJson("/api/events/{$event->id}/register")
            ->assertStatus(201)
            ->assertJsonPath('status', Registration::STATUS_WAITLIST);
    }

    public function test_cancellation_sets_status_to_cancelled(): void
    {
        $event = $this->makeApprovedEvent(5);

        $this->actingAs($this->attendee)->postJson("/api/events/{$event->id}/register");

        $this->actingAs($this->attendee)
            ->deleteJson("/api/events/{$event->id}/register")
            ->assertOk();

        $this->assertDatabaseHas('registrations', [
            'event_id' => $event->id,
            'user_id' => $this->attendee->id,
            'status' => Registration::STATUS_CANCELLED,
        ]);
    }

    public function test_unauthenticated_user_cannot_register(): void
    {
        $event = $this->makeApprovedEvent(5);

        $this->postJson("/api/events/{$event->id}/register")->assertStatus(401);
    }

    public function test_mine_returns_only_own_registrations(): void
    {
        $event = $this->makeApprovedEvent(5);

        $other = User::factory()->create();
        $other->assignRole('attendee');
        Registration::create(['event_id' => $event->id, 'user_id' => $other->id, 'status' => 'registered']);

        $this->actingAs($this->attendee)->postJson("/api/events/{$event->id}/register");

        $res = $this->actingAs($this->attendee)->getJson('/api/registrations/mine');

        $res->assertOk();
        $data = $res->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals($this->attendee->id, $data[0]['user_id']);
    }
}
