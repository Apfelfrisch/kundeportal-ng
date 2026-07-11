<?php

declare(strict_types=1);

use App\Integrations\CustomerDataApi\Exceptions\ContractNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();

        $middleware->alias([
            'admin' => App\Http\Middleware\EnsureAdmin::class,
            'feature' => App\Http\Middleware\EnsureFeature::class,
            'password.set' => App\Http\Middleware\EnsurePasswordSet::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // KVS answered 404 / empty for a contract — the German message of the
        // exception is already user facing.
        $exceptions->render(
            static fn (ContractNotFoundException $exception): JsonResponse => response()->json(
                ['message' => $exception->getMessage()],
                404,
            ),
        );
    })->create();
