<?php

declare(strict_types=1);

namespace App\Integrations\Support;

use App\Integrations\CustomerDataApi\Exceptions\InvalidApiPayloadException;
use Carbon\CarbonImmutable;
use Throwable;

/**
 * Strict, typed reader for decoded JSON payloads of the external APIs.
 *
 * Three access flavours per type:
 *  - `type($key)`          — key must exist and hold a non-null value of the type.
 *  - `nullableType($key)`  — key must exist, value may be null.
 *  - `optionalType($key)`  — `?? null` semantics of the old repositories: a missing
 *                            key OR a null value both yield null.
 *
 * Every violation throws {@see InvalidApiPayloadException} naming the offending
 * key (with its full path for nested structures, e.g. "meter_points.0.malo_id").
 */
final readonly class Payload
{
    /**
     * @param  array<array-key, mixed>  $data
     */
    private function __construct(
        private array $data,
        private string $path,
    ) {}

    /**
     * @param  array<array-key, mixed>  $data
     */
    public static function of(array $data, string $path = ''): self
    {
        return new self($data, $path);
    }

    public function int(string $key): int
    {
        return $this->toInt($key, $this->requireValue($key));
    }

    public function nullableInt(string $key): ?int
    {
        $value = $this->requireKey($key);

        return $value === null ? null : $this->toInt($key, $value);
    }

    public function optionalInt(string $key): ?int
    {
        $value = $this->data[$key] ?? null;

        return $value === null ? null : $this->toInt($key, $value);
    }

    public function string(string $key): string
    {
        return $this->toString($key, $this->requireValue($key));
    }

    public function nullableString(string $key): ?string
    {
        $value = $this->requireKey($key);

        return $value === null ? null : $this->toString($key, $value);
    }

    public function optionalString(string $key): ?string
    {
        $value = $this->data[$key] ?? null;

        return $value === null ? null : $this->toString($key, $value);
    }

    public function float(string $key): float
    {
        return $this->toFloat($key, $this->requireValue($key));
    }

    public function nullableFloat(string $key): ?float
    {
        $value = $this->requireKey($key);

        return $value === null ? null : $this->toFloat($key, $value);
    }

    public function optionalFloat(string $key): ?float
    {
        $value = $this->data[$key] ?? null;

        return $value === null ? null : $this->toFloat($key, $value);
    }

    /**
     * Loose boolean with PHP `(bool)` cast semantics, null counts as false.
     * Mirrors the old `(boolean) $meter['smart_meter']` handling.
     */
    public function looseBool(string $key): bool
    {
        $value = $this->requireKey($key);

        if ($value !== null && ! is_scalar($value)) {
            throw InvalidApiPayloadException::wrongType($this->qualify($key), 'bool', $value);
        }

        return (bool) $value;
    }

    public function date(string $key): CarbonImmutable
    {
        return $this->toDate($key, $this->requireValue($key));
    }

    public function nullableDate(string $key): ?CarbonImmutable
    {
        $value = $this->requireKey($key);

        return $value === null ? null : $this->toDate($key, $value);
    }

    public function optionalDate(string $key): ?CarbonImmutable
    {
        $value = $this->data[$key] ?? null;

        return $value === null ? null : $this->toDate($key, $value);
    }

    public function payload(string $key): self
    {
        $value = $this->requireValue($key);

        if (! is_array($value)) {
            throw InvalidApiPayloadException::wrongType($this->qualify($key), 'array', $value);
        }

        return new self($value, $this->qualify($key));
    }

    public function optionalPayload(string $key): ?self
    {
        $value = $this->data[$key] ?? null;

        if ($value === null) {
            return null;
        }

        if (! is_array($value)) {
            throw InvalidApiPayloadException::wrongType($this->qualify($key), 'array', $value);
        }

        return new self($value, $this->qualify($key));
    }

    /**
     * List of nested objects. The key must exist and hold an array of arrays.
     *
     * @return list<self>
     */
    public function payloadList(string $key): array
    {
        $value = $this->requireValue($key);

        return $this->toPayloadList($key, $value);
    }

    /**
     * `?? null` semantics for lists of nested objects (old repositories used
     * `$data['...'] ?? null` for price components).
     *
     * @return list<self>|null
     */
    public function optionalPayloadList(string $key): ?array
    {
        $value = $this->data[$key] ?? null;

        return $value === null ? null : $this->toPayloadList($key, $value);
    }

    /**
     * @return list<self>
     */
    private function toPayloadList(string $key, mixed $value): array
    {
        if (! is_array($value)) {
            throw InvalidApiPayloadException::wrongType($this->qualify($key), 'list', $value);
        }

        $payloads = [];

        foreach (array_values($value) as $index => $item) {
            if (! is_array($item)) {
                throw InvalidApiPayloadException::wrongType($this->qualify($key).'.'.$index, 'array', $item);
            }

            $payloads[] = new self($item, $this->qualify($key).'.'.$index);
        }

        return $payloads;
    }

    private function toInt(string $key, mixed $value): int
    {
        if (is_int($value)) {
            return $value;
        }

        if (is_string($value) && preg_match('/^-?\d+$/', $value) === 1) {
            return (int) $value;
        }

        throw InvalidApiPayloadException::wrongType($this->qualify($key), 'int', $value);
    }

    private function toString(string $key, mixed $value): string
    {
        if (is_string($value)) {
            return $value;
        }

        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }

        throw InvalidApiPayloadException::wrongType($this->qualify($key), 'string', $value);
    }

    private function toFloat(string $key, mixed $value): float
    {
        if (is_float($value) || is_int($value)) {
            return (float) $value;
        }

        if (is_string($value) && is_numeric($value)) {
            return (float) $value;
        }

        throw InvalidApiPayloadException::wrongType($this->qualify($key), 'float', $value);
    }

    private function toDate(string $key, mixed $value): CarbonImmutable
    {
        if (! is_string($value) || trim($value) === '') {
            throw InvalidApiPayloadException::wrongType($this->qualify($key), 'date string', $value);
        }

        try {
            return CarbonImmutable::parse($value);
        } catch (Throwable) {
            throw InvalidApiPayloadException::wrongType($this->qualify($key), 'date string', $value);
        }
    }

    /**
     * The key must exist; the value may be null.
     */
    private function requireKey(string $key): mixed
    {
        if (! array_key_exists($key, $this->data)) {
            throw InvalidApiPayloadException::missingKey($this->qualify($key));
        }

        return $this->data[$key];
    }

    /**
     * The key must exist and the value must not be null.
     */
    private function requireValue(string $key): mixed
    {
        $value = $this->requireKey($key);

        if ($value === null) {
            throw InvalidApiPayloadException::wrongType($this->qualify($key), 'non-null', $value);
        }

        return $value;
    }

    private function qualify(string $key): string
    {
        return $this->path === '' ? $key : $this->path.'.'.$key;
    }
}
