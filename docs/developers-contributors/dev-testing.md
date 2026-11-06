---
title: "Testing the SDK"
description: "Running the test suite, adding unit tests, and verifying preflight rules."
product: sdk
section: developers-contributors
order: 4
icon: CheckCircle
slug: dev-testing
---

# Testing the SDK

The `@weavetab/sdk` test suite uses Node's native test runner (`node:test`). Tests run completely offline and finish in under two seconds.

---

## 1. Running Tests

Run the entire test suite from the `sdk/` directory:

```bash
npm test
```

Or run a specific test file:

```bash
node --test tests/preflight.test.ts
node --test tests/builder.test.ts
```

---

## 2. Test Coverage Areas

1. **`tests/preflight.test.ts`**:
   - Asserts that instructions over 3,200 characters are rejected.
   - Asserts that instructions under 20 characters are rejected.
   - Asserts that legacy `AGENTS.md` over 80 lines is rejected.
   - Asserts that undeclared command or tool permissions trigger preflight failures.
2. **`tests/builder.test.ts`**:
   - Verifies fluent builder method chaining.
   - Asserts permission declaration enforcement when attaching tools and commands.
3. **`tests/cli.test.ts`**:
   - Tests CLI subcommands (`init`, `build`, `validate`, `doctor`).
4. **`tests/testing.test.ts`**:
   - Tests `simulateToolCall`, `simulateCommandCall`, and `createMockContext`.
