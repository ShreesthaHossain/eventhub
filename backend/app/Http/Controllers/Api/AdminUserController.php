<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->hasRole('admin')) {
            abort(403);
        }

        $users = User::query()
            ->with('roles')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (User $u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'email'      => $u->email,
                'roles'      => $u->getRoleNames()->values()->all(),
                'created_at' => $u->created_at->toDateString(),
            ]);

        return response()->json(['data' => $users]);
    }
}
