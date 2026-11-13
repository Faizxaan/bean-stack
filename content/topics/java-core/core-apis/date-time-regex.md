---
id: date-time-regex
title: Date and Time and Regular Expressions
track: java-core
section: core-apis
order: 4
difficulty: Intermediate
importance: 3
tags: [Date Time, Regex, java.time]
prerequisites: [strings]
related: []
status: complete
lastUpdated: 2026-11-04
summary: The modern java.time API for dates and times plus pattern matching with regular expressions.
---

## Overview

Dates and times used to be one of Java's weakest areas, with mutable, confusing classes and month numbers starting at zero. The `java.time` API, introduced in Java 8, replaced them with immutable, clearly named types that distinguish a date, a time, a date-time, an instant, and a duration.

Regular expressions, or regex, are a compact language for describing text patterns: validating an email shape, extracting numbers from a log line, or splitting a string on flexible separators. Used well, a single pattern replaces pages of manual string code; used carelessly, it becomes unreadable. Both topics are practical, interview-relevant, and easy to get wrong in small ways.

## Theory

### The java.time types

Pick the type that matches what you actually mean. `LocalDate` is a date without a time or time zone (2026-11-04). `LocalTime` is a time of day without a date. `LocalDateTime` combines both but still has no time zone, so it cannot be mapped to a single moment on a timeline. `ZonedDateTime` adds a time zone, and `OffsetDateTime` adds a fixed offset from UTC. `Instant` is a point on the timeline in UTC, the right type for timestamps, logging, and storing moments.

All `java.time` types are immutable and thread-safe. Operations such as `plusDays` return a new instance; they never modify the original. That is a deliberate break from the old `java.util.Date` and `Calendar`, which were mutable and not thread-safe.

`Period` measures date-based amounts (years, months, days), while `Duration` measures time-based amounts (hours, minutes, seconds, nanoseconds). Adding a `Period` of one month to 31 January gives 28 February (or 29 in a leap year); adding a `Duration` of 24 hours always adds exactly 24 hours, which may cross a daylight-saving change differently.

Formatting and parsing use `DateTimeFormatter`. Patterns use letters such as `yyyy` for year, `MM` for month, and `dd` for day of month. Note the case: `MM` is month, `mm` is minutes. Formatters are thread-safe, unlike the old `SimpleDateFormat`.

### Regular expressions

A regex is a pattern matched against text. Literal characters match themselves; metacharacters have special meanings. The most useful are `.` (any character except a line break), `\d` (a digit), `\w` (a word character: letter, digit, or underscore), `\s` (whitespace), `*` (zero or more), `+` (one or more), `?` (zero or one, or lazy when following another quantifier), `^` (start), `$` (end), `[...]` (a character class), and `(...)` (a group that can be captured).

Quantifiers are greedy by default: they take as much as possible while still allowing the overall match to succeed. `.*` before a closing quote, for example, can swallow more than intended. Adding `?` makes a quantifier lazy, taking as little as possible.

In Java, a backslash in a regex must be written as `\\` in a string literal, because the string parser consumes one level of escaping first. So the regex `\d+` appears in code as `"\\d+"`. `Pattern.compile` turns a pattern string into a reusable `Pattern`, and `Matcher` performs matching. `String.matches` is a shortcut that requires the whole string to match, while `Matcher.find` looks for a match anywhere inside the text, and `Matcher.matches` requires a full match like `String.matches`.

## Key Concepts

- **LocalDate, LocalTime, LocalDateTime:** date and time without a time zone.
- **ZonedDateTime, OffsetDateTime, Instant:** date-times tied to a zone, an offset, or UTC respectively.
- **Period vs Duration:** date-based amounts versus time-based amounts.
- **DateTimeFormatter:** thread-safe formatting and parsing with patterns like `yyyy-MM-dd`.
- **Pattern and Matcher:** compiled regex and the engine that applies it to text.
- **Greedy vs lazy quantifiers:** taking as much as possible versus as little as possible.
- **Character class and group:** `[...]` matching one of a set, `(...)` grouping and capturing.

## Code Examples

### Dates, periods, and formatting

```java
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class DateDemo {
    public static void main(String[] args) {
        LocalDate today = LocalDate.of(2026, 11, 4);
        LocalDate later = today.plus(Period.ofMonths(1));
        System.out.println(later);
        System.out.println(today.plusDays(1));
        System.out.println(today);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH);
        System.out.println(today.format(fmt));
        LocalDate parsed = LocalDate.parse("2026-11-04");
        System.out.println(parsed.equals(today));
    }
}
```

Output:

```text
2026-12-04
2026-11-05
2026-11-04
04 Nov 2026
true
```

Explanation: `plus` returns a new date, so `today` is unchanged on the third line. `LocalDate.parse` understands the ISO format `yyyy-MM-dd` without an explicit formatter.

### Instants and durations

```java
import java.time.Duration;
import java.time.Instant;

public class InstantDemo {
    public static void main(String[] args) {
        Instant start = Instant.parse("2026-11-04T06:00:00Z");
        Instant end = start.plus(Duration.ofMinutes(90));
        System.out.println(end);
        System.out.println(Duration.between(start, end).toMinutes());
    }
}
```

Output:

```text
2026-11-04T07:30:00Z
90
```

Explanation: an `Instant` is a UTC timestamp, and adding a 90-minute duration moves it forward by exactly that amount, regardless of time zones.

### Regex validation and extraction

```java
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class RegexDemo {
    public static void main(String[] args) {
        String code = "ORD-12345";
        System.out.println(code.matches("ORD-\\d+"));
        System.out.println("abc".matches("ORD-\\d+"));
        Pattern p = Pattern.compile("(\\d+)-(\\d+)");
        Matcher m = p.matcher("Range 10-20 found");
        if (m.find()) {
            System.out.println(m.group(1));
            System.out.println(m.group(2));
        }
        String[] parts = "a, b;  c".split("[,;]\\s*");
        System.out.println(parts.length);
        System.out.println(parts[2]);
    }
}
```

Output:

```text
true
false
10
20
3
c
```

Explanation: `matches` requires the whole string to fit the pattern. `find` locates `10-20` inside a longer string, and groups 1 and 2 capture the two numbers. The split pattern means a comma or semicolon followed by optional whitespace, so the three parts are `a`, `b`, and `c`.

## Best Practices

- Always use `java.time` for new code, and pick the type that matches the concept: `LocalDate` for birthdays, `Instant` for event timestamps, `ZonedDateTime` for user-visible times in a specific zone.
- Never mutate a `java.time` object; assign the result of `plus` or `minus` to a variable.
- Store timestamps as `Instant` (or UTC) and convert to a zone only when displaying them.
- Compile a `Pattern` once and reuse it when matching many strings, instead of calling `String.matches` in a loop, which compiles the pattern every time.
- Keep regexes short and readable: prefer a simple pattern plus a small amount of code over one giant pattern, and comment any pattern that is not obvious.
- Validate with regex only for shape, not for full correctness. A regex can check that an email looks plausible, but it cannot confirm the mailbox exists.

## Common Mistakes

- Using the old `Date`, `Calendar`, or `SimpleDateFormat` in new code, or sharing a `SimpleDateFormat` across threads.
- Confusing `MM` (month) with `mm` (minutes) in a formatter pattern, or `Period` (date-based) with `Duration` (time-based).
- Treating a `LocalDateTime` as a moment in time: without a zone it cannot be converted to an `Instant` unambiguously.
- Forgetting that `java.time` objects are immutable and discarding the result of `plusDays` or similar calls.
- Writing a regex with a single backslash in a Java string, such as `"\d+"`, which is a compile error, instead of `"\\d+"`.
- Using `matches` when `find` was intended, or vice versa, and being surprised that a partial match fails or succeeds.
- Writing a greedy `.*` that swallows too much text when a lazy `.*?` or a negated class was needed.

## Interview Importance

Interviewers use `java.time` to check whether a candidate writes modern Java or still reaches for the legacy date classes, and they probe immutability, `Period` versus `Duration`, and zone handling. Regex questions tend to be practical: validate a format, extract a value, or explain greedy matching, often inside a coding exercise rather than as pure theory.

## Interview Questions

- **Why is `java.time` better than `Date` and `Calendar`?** The new types are immutable and thread-safe, have clear names for each concept, use sane numbering (months 1 to 12), and separate human calendar concepts from machine timeline concepts.
- **What is the difference between `Period` and `Duration`?** `Period` is date-based (years, months, days) and respects calendar rules; `Duration` is time-based (seconds, nanoseconds) and exact. One month is a `Period`; 24 hours is a `Duration`.
- **Why should you not store a moment as a `LocalDateTime`?** It has no zone or offset, so the same value can mean different instants in different places, and converting it to an instant requires assuming a zone.
- **What is the difference between `matches` and `find`?** `matches` (and `Matcher.matches`) requires the entire input to match the pattern; `find` succeeds if any substring matches.
- **Why do you write `"\\d+"` in Java source for the regex `\d+`?** The Java string literal consumes one backslash as an escape, so two are needed in source to produce one in the actual pattern string.

## Revision Summary

- `LocalDate`, `LocalTime`, `LocalDateTime` have no zone; `ZonedDateTime` and `Instant` pin a value to a zone or to UTC.
- All `java.time` types are immutable; `plus` and `minus` return new instances.
- `Period` is date-based; `Duration` is time-based; formatters use `MM` for month and `mm` for minutes.
- `Pattern.compile` once, reuse often; `matches` needs a full match, `find` needs only a substring.
- In Java source, regex backslashes are doubled: `"\\d+"`.
- Greedy quantifiers take as much as possible; lazy ones, written with a trailing `?`, take as little as possible.

## Version Differences

- **Java 8:** `java.time` and the modern date-time API arrive, replacing `Date` and `Calendar` for new code.
- **Java 11:** no change to `java.time` or regex fundamentals.
- **Java 17:** no change to the core APIs covered here.
- **Java 21:** no change; text blocks make long regex patterns slightly easier to write, but escaping rules are unchanged.
