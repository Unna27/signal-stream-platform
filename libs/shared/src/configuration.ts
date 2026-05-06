export const configuration = () => ({
  app: {
    port: parseInt(process.env.PORT ?? '3000', 10),
    api_gateway_port: parseInt(process.env.API_GATEWAY_PORT ?? '3001', 10),
    analytics_service_port: parseInt(
      process.env.ANALYTICS_SERVICE_PORT ?? '3002',
      10,
    ),
    auth_service_port: parseInt(process.env.AUTH_SERVICE_PORT ?? '3003', 10),
  },
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5434', 10),
    user: process.env.DB_USER ?? 'user',
    password: process.env.DB_PASSWORD ?? 'pass',
    name: process.env.DB_NAME ?? 'signal-stream-platform',
  },
  kafka: {
    broker: process.env.KAFKA_BROKER ?? 'localhost:9092',
    topics: {
      input: process.env.SIGNAL_INPUT_TOPIC ?? 'raw-signals',
      output: process.env.SIGNAL_OUTPUT_TOPIC ?? 'processed-signals',
      failed: process.env.SIGNAL_FAILED_TOPIC ?? 'storage-signals-failed',
    },
  },
});

export type AppConfig = ReturnType<typeof configuration>;
