<?php

declare(strict_types=1);

namespace Tests\Unit\Integrations\Support;

use App\Integrations\CustomerDataApi\Exceptions\InvalidApiPayloadException;
use App\Integrations\Support\Payload;
use PHPUnit\Framework\TestCase;

final class PayloadTest extends TestCase
{
    public function test_missing_keys_throw_an_exception_naming_the_key(): void
    {
        $this->expectException(InvalidApiPayloadException::class);
        $this->expectExceptionMessage('Feld "id" fehlt in der API-Antwort.');

        Payload::of([])->int('id');
    }

    public function test_null_values_for_required_fields_throw(): void
    {
        $this->expectException(InvalidApiPayloadException::class);
        $this->expectExceptionMessage('Feld "id"');

        Payload::of(['id' => null])->int('id');
    }

    public function test_wrong_types_throw_an_exception_naming_key_and_types(): void
    {
        $this->expectException(InvalidApiPayloadException::class);
        $this->expectExceptionMessage('Feld "amount" hat einen ungültigen Wert vom Typ "string" (erwartet: float).');

        Payload::of(['amount' => 'abc'])->float('amount');
    }

    public function test_nested_list_errors_carry_the_full_key_path(): void
    {
        $payload = Payload::of(['meter_points' => [['malo_id' => []]]]);

        $this->expectException(InvalidApiPayloadException::class);
        $this->expectExceptionMessage('Feld "meter_points.0.malo_id"');

        $payload->payloadList('meter_points')[0]->nullableString('malo_id');
    }

    public function test_numeric_strings_are_accepted_for_int_and_float(): void
    {
        $payload = Payload::of(['id' => '42', 'price' => '39.95']);

        $this->assertSame(42, $payload->int('id'));
        $this->assertSame(39.95, $payload->float('price'));
    }

    public function test_int_and_float_scalars_are_accepted_for_string(): void
    {
        $payload = Payload::of(['customer_id' => 10001]);

        $this->assertSame('10001', $payload->string('customer_id'));
    }

    public function test_nullable_accessors_require_the_key_but_allow_null(): void
    {
        $payload = Payload::of(['delivery_end' => null]);

        $this->assertNull($payload->nullableDate('delivery_end'));

        $this->expectException(InvalidApiPayloadException::class);
        $this->expectExceptionMessage('Feld "delivery_start" fehlt in der API-Antwort.');

        $payload->nullableDate('delivery_start');
    }

    public function test_optional_accessors_treat_missing_keys_as_null(): void
    {
        $payload = Payload::of([]);

        $this->assertNull($payload->optionalString('sales_partner_id'));
        $this->assertNull($payload->optionalInt('usage_type'));
        $this->assertNull($payload->optionalDate('received_at'));
        $this->assertNull($payload->optionalPayloadList('price_components'));
        $this->assertNull($payload->optionalPayload('contract_tariff'));
    }

    public function test_loose_bool_follows_php_cast_semantics(): void
    {
        $payload = Payload::of(['a' => null, 'b' => 0, 'c' => 1, 'd' => '1', 'e' => true]);

        $this->assertFalse($payload->looseBool('a'));
        $this->assertFalse($payload->looseBool('b'));
        $this->assertTrue($payload->looseBool('c'));
        $this->assertTrue($payload->looseBool('d'));
        $this->assertTrue($payload->looseBool('e'));
    }

    public function test_dates_are_parsed_into_carbon_immutable(): void
    {
        $payload = Payload::of(['reading_date' => '2025-06-30 12:15:00']);

        $this->assertSame('2025-06-30 12:15:00', $payload->date('reading_date')->format('Y-m-d H:i:s'));
    }

    public function test_unparsable_dates_throw(): void
    {
        $this->expectException(InvalidApiPayloadException::class);
        $this->expectExceptionMessage('Feld "reading_date"');

        Payload::of(['reading_date' => 'not a date'])->date('reading_date');
    }
}
