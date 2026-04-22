<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\UserInterest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecommendationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $categoryIds = UserInterest::query()
            ->where('user_id', $user->id)
            ->pluck('category_id')
            ->all();

        $query = Event::query()
            ->where('status', Event::STATUS_APPROVED)
            ->where('end_at', '>=', now())
            ->with(['category', 'venue']);

        if ($categoryIds !== []) {
            $query->whereIn('category_id', $categoryIds);
        }

        $events = $query->orderBy('start_at')->limit(12)->get();

        return response()->json(['data' => $events]);
    }
}
