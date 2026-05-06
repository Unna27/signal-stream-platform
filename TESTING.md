# Testing & Debugging

Quick guide to run tests locally and in CI.

## Unit tests (Jest)

Install dependencies:

```bash
npm ci
```

Run unit tests:

```bash
npm run test:unit
```

## API tests (Jest + Supertest)

These tests start the Nest modules in-process. Run:

```bash
npm run test:api
```

## Integration tests (Kafka + Postgres)

This repository includes `docker-compose.kafka-postgres.yml` which starts Zookeeper, Kafka, and Postgres for integration testing.

Start services:

```bash
docker compose -f docker-compose.kafka-postgres.yml up -d
```

Then run the integration test and tell the test to skip starting containers (we start Postgres via docker-compose):

```bash
SKIP_CONTAINERS=1 KAFKA_BROKER=localhost:9092 DB_HOST=localhost DB_PORT=5432 npm run test -- apps/storage-service/test/integration/kafka-to-db.spec.ts --runInBand
```

Notes:

- Ensure Docker is running and has enough resources.
- The test will create the `pgcrypto` extension if missing.

## Playwright E2E & UI (signal-dashboard)

Install Playwright browsers (inside `signal-dashboard`):

```bash
cd signal-dashboard
npm ci
npm run playwright:install
```

Run Playwright tests (inside `signal-dashboard`):

```bash
cd signal-dashboard
npm run test:e2e
```

## k6 performance tests

Install k6 locally or run in Docker. Example (Docker):

```bash
docker run -i loadimpact/k6 run - < tests/perf/k6/api-load.js
```

## Debugging tips

- Jest: run `node --inspect-brk node_modules/.bin/jest --runInBand <testfile>` and attach VS Code debugger.
- Playwright: use `npx playwright test --debug` or set `PWDEBUG=1`.
- Integration: tail logs with `docker compose -f docker-compose.kafka-postgres.yml logs -f`.
