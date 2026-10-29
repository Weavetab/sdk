---
title: "Testing Suites"
description: "SDK schema tests and MCP runtime test suites."
product: sdk
section: developers-contributors
icon: FlaskConical
slug: dev-testing
---

# Testing Suites

```
sdk/test/
└── schema.test.mjs     # Zod-to-JSON-Schema exporter & manifest validation tests

MCP/tests/
├── unit/               # Core engine unit tests (walker, delta, cache, plugins, security)
└── e2e/                # Live Chromium automation smoke tests
```

```bash
# Run SDK test suite (inside /sdk)
npm test

# Run MCP unit test suite (inside /MCP)
npm run test:unit
```
