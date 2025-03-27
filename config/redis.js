const Redis = require("ioredis");
require("dotenv").config();

const redisClient = new Redis(process.env.REDIS_URL);

redisClient.on("connect", () => {
  console.log("Conectado a Redis exitosamente");
});

redisClient.on("error", (err) => {
  console.error("Error de conexión Redis:", err);
});

module.exports = redisClient;
