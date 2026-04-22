<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $items = Category::query()->orderBy('name')->get(['id', 'name', 'slug']);

        return response()->json(['data' => $items]);
    }
}
