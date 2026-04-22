<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserInterest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserInterestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $categoryIds = UserInterest::query()
            ->where('user_id', $request->user()->id)
            ->pluck('category_id');

        return response()->json(['category_ids' => $categoryIds]);
    }

    public function sync(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category_ids' => ['required', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
        ]);

        UserInterest::query()->where('user_id', $request->user()->id)->delete();

        foreach ($data['category_ids'] as $categoryId) {
            UserInterest::create([
                'user_id' => $request->user()->id,
                'category_id' => $categoryId,
            ]);
        }

        return response()->json(['message' => 'Interests updated.']);
    }
}
