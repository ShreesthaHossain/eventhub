<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminEventTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $organizer;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['admin', 'organizer', 'attendee', 'sponsor'] as $role) {
            Role::create(['name' => $role, 'guard_name' => 'web']);
        }

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');

        $this->organizer = User::factory()->create();
        $this->organizer->assignRole('organizer');
    }

    private function makePendingEvent(): Event
    {
        return Event::create([
            'organizer_id' => $this->organizer->id,
            'title' => 'Pending Event',
            'description' => 'Desc',
            'start_at' => now()->addDay(),
            'end_at' => now()->addDays(2),
            'total_seats' => 50,
            'status' => Event::STATUS_PENDING,
        ]);
    }

    public function test_admin_can_list_pending_events(): void
    {
        $this->makePendingEvent();

        $this->actingAs($this->admin)
            ->getJson('/api/admin/events/pending')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_non_admin_cannot_list_pending_events(): void
    {
        $attendee = User::factory()->create();
        $attendee->assignRole('attendee');

        $this->actingAs($attendee)
            ->getJson('/api/admin/events/pending')
            ->assertStatus(403);
    }

    public function test_admin_can_approve_event(): void
    {
        $event = $this->makePendingEvent();

        $this->actingAs($this->admin)
            ->postJson("/api/admin/events/{$event->id}/approve")
            ->assertOk();

        $this->assertDatabaseHas('events', [
            'id' => $event->id,
            'status' => Event::STATUS_APPROVED,
        ]);
    }

    public function test_admin_can_reject_event_with_reason(): void
    {
        $event = $this->makePendingEvent();

        $this->actingAs($this->admin)
            ->postJson("/api/admin/events/{$event->id}/reject", ['reason' => 'Incomplete details'])
            ->assertOk();

        $this->assertDatabaseHas('events', [
            'id' => $event->id,
            'status' => Event::STATUS_REJECTED,
            'rejection_reason' => 'Incomplete details',
        ]);
    }

    public function test_organizer_can_create_and_submit_event(): void
    {
        $res = $this->actingAs($this->organizer)
            ->postJson('/api/events', [
                'title' => 'My Event',
                'description' => 'About it',
                'start_at' => now()->addDays(5)->toIso8601String(),
                'end_at' => now()->addDays(6)->toIso8601String(),
                'total_seats' => 100,
            ]);

        $res->assertStatus(201)->assertJsonPath('status', Event::STATUS_DRAFT);

        $eventId = $res->json('id');

        $this->actingAs($this->organizer)
            ->postJson("/api/events/{$eventId}/submit")
            ->assertOk();

        $this->assertDatabaseHas('events', [
            'id' => $eventId,
            'status' => Event::STATUS_PENDING,
        ]);
    }

    public function test_non_organizer_cannot_create_event(): void
    {
        $attendee = User::factory()->create();
        $attendee->assignRole('attendee');

        $this->actingAs($attendee)
            ->postJson('/api/events', [
                'title' => 'Sneaky Event',
                'start_at' => now()->addDay()->toIso8601String(),
                'end_at' => now()->addDays(2)->toIso8601String(),
                'total_seats' => 10,
            ])->assertStatus(403);
    }

    public function test_organizer_cannot_edit_approved_event_dates(): void
    {
        $event = Event::create([
            'organizer_id' => $this->organizer->id,
            'title' => 'Live Event',
            'description' => 'Desc',
            'start_at' => now()->addDay(),
            'end_at' => now()->addDays(2),
            'total_seats' => 50,
            'status' => Event::STATUS_APPROVED,
        ]);

        $originalStart = $event->start_at->toIso8601String();

        $this->actingAs($this->organizer)
            ->putJson("/api/events/{$event->id}", [
                'title' => 'Updated Title',
                'start_at' => now()->addDays(10)->toIso8601String(),
            ])->assertOk();

        // Title may update but start_at should be silently ignored
        $this->assertDatabaseHas('events', ['id' => $event->id, 'title' => 'Updated Title']);
        $this->assertEquals(
            $originalStart,
            $event->fresh()->start_at->toIso8601String()
        );
    }
}
