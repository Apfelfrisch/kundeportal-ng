<?php

declare(strict_types=1);

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Customers only ever see confirmed contract assignments. Staff flows opt
 * out via ContractToUser::withUnconfirmed().
 *
 * @implements Scope<Model>
 */
final class ConfirmedScope implements Scope
{
    /**
     * @param  Builder<covariant Model>  $builder
     */
    public function apply(Builder $builder, Model $model): void
    {
        $builder->where('confirmed', true);
    }
}
