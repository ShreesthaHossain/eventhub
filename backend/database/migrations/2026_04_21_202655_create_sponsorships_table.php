<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sponsorships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sponsor_id')->constrained('users')->cascadeOnDelete();
            $table->string('tier', 64)->default('bronze'); // bronze, silver, gold, platinum
            $table->decimal('amount', 10, 2)->default(0);
            $table->string('status', 32)->default('pending'); // pending, approved, rejected
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['event_id', 'sponsor_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sponsorships');
    }
};
