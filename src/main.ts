import { loadConfig } from "./config.js";
import { buildServer } from "./server.js";

const start = async (): Promise<void> => {
  const config = loadConfig();
  const app = buildServer(config);

  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (error) {
    app.log.error({ err: error }, "Server failed to start");
    process.exit(1);
  }
};

void start();
