<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (['admin', 'organizer', 'attendee', 'sponsor'] as $role) {
            Role::create(['name' => $role, 'guard_name' => 'web']);
        }
    }

    public function test_register_creates_user_with_attendee_role(): void
    {
        $res = $this->postJson('/api/auth/register', [
            'name' => 'Alice',
            'email' => 'alice@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'role' => 'attendee',
        ]);

        $res->assertStatus(201)
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'roles']]);

        $this->assertDatabaseHas('users', ['email' => 'alice@example.com']);
    }

    public function test_register_rejects_invalid_role(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Bad',
            'email' => 'bad@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'role' => 'superuser',
        ])->assertStatus(422);
    }

    public function test_login_returns_token(): void
    {
        $user = User::factory()->create(['password' => bcrypt('secret123')]);
        $user->assignRole('attendee');

        $res = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'secret123',
        ]);

        $res->assertOk()->assertJsonStructure(['token', 'user']);
    }

    public function test_login_rejects_wrong_password(): void
    {
        $user = User::factory()->create(['password' => bcrypt('correct')]);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'wrong',
        ])->assertStatus(422)->assertJsonPath('message', 'Invalid credentials.');
    }

    public function test_me_returns_authenticated_user(): void
    {
        $user = User::factory()->create();
        $user->assignRole('attendee');
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('email', $user->email);
    }

    public function test_logout_revokes_token(): void
    {
        $user = User::factory()->create();
        $user->assignRole('attendee');
        $result = $user->createToken('test');
        $tokenId = $result->accessToken->id;

        $this->withToken($result->plainTextToken)
            ->postJson('/api/auth/logout')
            ->assertOk();

        // Token row should be gone from DB
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);
    }
}
