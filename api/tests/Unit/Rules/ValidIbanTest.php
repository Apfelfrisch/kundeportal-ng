<?php

declare(strict_types=1);

namespace Tests\Unit\Rules;

use App\Rules\ValidIban;
use Illuminate\Translation\ArrayLoader;
use Illuminate\Translation\PotentiallyTranslatedString;
use Illuminate\Translation\Translator;
use PHPUnit\Framework\TestCase;

final class ValidIbanTest extends TestCase
{
    public function test_valid_ibans_pass(): void
    {
        $this->assertNull($this->failureFor('DE44500105175407324931'));
        $this->assertNull($this->failureFor('DE32400605600002836572'));
    }

    public function test_invalid_ibans_fail_with_the_german_message(): void
    {
        $this->assertSame('Die angegeben IBAN ist nicht korrekt.', $this->failureFor('DE00123456'));
        $this->assertSame('Die angegeben IBAN ist nicht korrekt.', $this->failureFor('DE44500105175407324932'));
        $this->assertSame('Die angegeben IBAN ist nicht korrekt.', $this->failureFor(''));
    }

    public function test_non_string_values_fail(): void
    {
        $this->assertSame('Die angegeben IBAN ist nicht korrekt.', $this->failureFor(12345));
        $this->assertSame('Die angegeben IBAN ist nicht korrekt.', $this->failureFor(null));
        $this->assertSame('Die angegeben IBAN ist nicht korrekt.', $this->failureFor(['DE44500105175407324931']));
    }

    private function failureFor(mixed $value): ?string
    {
        $message = null;

        new ValidIban()->validate('iban', $value, function (string $failure) use (&$message): PotentiallyTranslatedString {
            $message = $failure;

            return new PotentiallyTranslatedString($failure, new Translator(new ArrayLoader, 'de'));
        });

        return $message;
    }
}
