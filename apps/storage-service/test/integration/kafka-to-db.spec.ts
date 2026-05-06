import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Pool } from 'pg';
import { Kafka } from 'kafkajs';

jest.setTimeout(180_000);

describe('Storage service integration: Kafka -> DB', () => {
  let pgContainer: StartedTestContainer;
  let app: INestApplication;
  let pgPool: Pool;

  beforeAll(async () => {
    const skipContainers = process.env.SKIP_CONTAINERS === '1';

    let pgHost: string;
    let pgPort: number;

    if (!skipContainers) {
      // Start Postgres
      pgContainer = await new GenericContainer('postgres:15-alpine')
        .withEnvironment({
          POSTGRES_USER: 'test',
          POSTGRES_PASSWORD: 'test',
          POSTGRES_DB: 'testdb',
        })
        .withExposedPorts([5432])
        .start();

      pgHost = pgContainer.getHost();
      pgPort = pgContainer.getMappedPort(5432);
    } else {
      pgHost = process.env.DB_HOST || 'localhost';
      pgPort = parseInt(process.env.DB_PORT || '5434');
    }

    // Debug: show environment and connection params
    console.log('SKIP_CONTAINERS=', process.env.SKIP_CONTAINERS);
    console.log(
      'DB_HOST=',
      process.env.DB_HOST,
      'DB_PORT=',
      process.env.DB_PORT,
      'DB_USER=',
      process.env.DB_USER,
      'DB_PASSWORD=',
      process.env.DB_PASSWORD,
    );

    // Ensure pgcrypto extension exists for gen_random_uuid used in schema
    const dbUser = process.env.DB_USER || 'user';
    const dbName = process.env.DB_NAME || 'signal_stream_platform';
    const dbPassword = process.env.DB_PASSWORD || 'pass';

    console.log('Connecting to Postgres at', pgHost, pgPort, 'as', dbUser);

    pgPool = new Pool({
      user: dbUser,
      host: pgHost,
      database: dbName,
      password: dbPassword,
      port: pgPort,
    });

    // wait for postgres to be ready (increase retries)
    let connected = false;
    for (let i = 0; i < 5 && !connected; i++) {
      try {
        await pgPool.query('SELECT 1');
        connected = true;
      } catch (err) {
        console.log(
          `Postgres not ready (attempt ${i + 1}/5):`,
          err.message || err,
        );
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    if (!connected) throw new Error('Postgres did not become ready in time');
    console.log('Connected to Postgres');
    // Create extension if missing
    try {
      await pgPool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    } catch (err) {
      console.error('CREATE EXTENSION failed:', err.message || err);
      throw err;
    }

    let kafkaHost: string;
    let kafkaPort: string | number;

    if (!skipContainers) {
      // We only start Postgres here via Testcontainers. For Kafka, prefer running via docker-compose
      // and set KAFKA_BROKER env. If KAFKA_BROKER is not provided, fail with a helpful message.
      if (!process.env.KAFKA_BROKER) {
        throw new Error(
          'KAFKA_BROKER not set. Start Kafka via docker-compose (see docker-compose.kafka-postgres.yml) or set KAFKA_BROKER env',
        );
      }
      const [kHost, kPort] = process.env.KAFKA_BROKER.split(':');
      kafkaHost = kHost;
      kafkaPort = kPort;

      // Set env for application modules to pick up
      process.env.DB_HOST = pgHost;
      process.env.DB_PORT = String(pgPort);
      process.env.DB_USER = process.env.DB_USER || 'user';
      process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'pass';
      process.env.DB_NAME = process.env.DB_NAME || 'signal_stream_platform';
      process.env.KAFKA_BROKER = `${kafkaHost}:${kafkaPort}`;
    } else {
      const [kHost, kPort] = (
        process.env.KAFKA_BROKER || 'localhost:9092'
      ).split(':');
      kafkaHost = kHost;
      kafkaPort = kPort;

      // Ensure envs are set for application modules
      process.env.DB_HOST = pgHost;
      process.env.DB_PORT = String(pgPort);
      process.env.DB_USER = process.env.DB_USER || 'user';
      process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'pass';
      process.env.DB_NAME = process.env.DB_NAME || 'signal_stream_platform';
    }

    // Start Nest application (storage service)
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        require('../../src/storage-service.module').StorageServiceModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (pgPool) await pgPool.end();
    if (pgContainer) await pgContainer.stop();
  });

  it('consumes processed-signals from Kafka and stores to DB', async () => {
    // create a test signal
    const testSignal = {
      id: 'signal-test-1',
      value: 12.34,
      timestamp: Date.now(),
      processedValue: 13.37,
      strength: 'medium',
      processedAt: Date.now(),
    };

    // Produce to Kafka using kafkajs
    const kafka = new Kafka({
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    });
    const producer = kafka.producer();
    await producer.connect();
    await producer.send({
      topic: process.env.SIGNAL_OUTPUT_TOPIC || 'processed-signals',
      messages: [{ key: testSignal.id, value: JSON.stringify(testSignal) }],
    });
    await producer.disconnect();

    // Wait for consumer in storage service to process and insert into DB
    const pool = new Pool({
      user: process.env.DB_USER || 'user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'signal_stream_platform',
      password: process.env.DB_PASSWORD || 'pass',
      port: parseInt(process.env.DB_PORT || '5434'),
    });

    let found;
    for (let i = 0; i < 20; i++) {
      const res = await pool.query(
        'SELECT signal_id as id, value FROM processed_signals WHERE signal_id = $1',
        [testSignal.id],
      );
      if (res.rows.length > 0) {
        found = res.rows[0];
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    await pool.end();
    expect(found).not.toBeNull();
    expect(Number(found.value)).toBeCloseTo(testSignal.value, 2);
  });
});
