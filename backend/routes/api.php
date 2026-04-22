<?php

use App\Http\Controllers\Api\AdminEventController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\RecommendationController;
use App\Http\Controllers\Api\RegistrationController;
use App\Http\Controllers\Api\SponsorshipController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\UserInterestController;
use App\Http\Controllers\Api\VenueController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:10,1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
});

Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/venues', [VenueController::class, 'index']);
Route::get('/events/calendar', [EventController::class, 'calendar']);
Route::get('/events', [EventController::class, 'index']);
Route::get('/events/{event}', [EventController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);

    Route::get('/recommendations', [RecommendationController::class, 'index']);

    Route::get('/registrations/mine', [RegistrationController::class, 'mine']);
    Route::post('/events', [EventController::class, 'store']);
    Route::put('/events/{event}', [EventController::class, 'update']);
    Route::delete('/events/{event}', [EventController::class, 'destroy']);
    Route::post('/events/{event}/submit', [EventController::class, 'submit']);

    Route::post('/events/{event}/register', [RegistrationController::class, 'store']);
    Route::delete('/events/{event}/register', [RegistrationController::class, 'destroy']);

    Route::get('/events/{event}/ticket', [TicketController::class, 'show']);

    Route::post('/attendance/scan', [AttendanceController::class, 'scan']);
    Route::get('/events/{event}/attendance', [AttendanceController::class, 'forEvent']);
    Route::get('/events/{event}/registrations', [RegistrationController::class, 'forEvent']);;

    Route::get('/admin/events/pending', [AdminEventController::class, 'pending']);
    Route::post('/admin/events/{event}/approve', [AdminEventController::class, 'approve']);
    Route::post('/admin/events/{event}/reject', [AdminEventController::class, 'reject']);

    Route::get('/admin/analytics/summary', [AnalyticsController::class, 'summary']);
    Route::get('/admin/users', [AdminUserController::class, 'index']);

    Route::get('/me/interests', [UserInterestController::class, 'index']);
    Route::put('/me/interests', [UserInterestController::class, 'sync']);

    // Sponsorship routes
    Route::get('/sponsorships/mine', [SponsorshipController::class, 'mine']);
    Route::post('/events/{event}/sponsor', [SponsorshipController::class, 'store']);
    Route::put('/sponsorships/{sponsorship}', [SponsorshipController::class, 'update']);
    Route::delete('/sponsorships/{sponsorship}', [SponsorshipController::class, 'destroy']);
    Route::get('/events/{event}/sponsorships', [SponsorshipController::class, 'indexForEvent']);
    Route::post('/admin/sponsorships/{sponsorship}/review', [SponsorshipController::class, 'review']);
});
