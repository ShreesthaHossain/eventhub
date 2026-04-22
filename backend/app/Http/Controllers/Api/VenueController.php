<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use Illuminate\Http\JsonResponse;

class VenueController extends Controller
{
    public function index(): JsonResponse
    {
        $items = Venue::query()->orderBy('name')->get(['id', 'name', 'address', 'capacity']);

        return response()->json(['data' => $items]);
    }
}
