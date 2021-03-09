const express = require("express");

const Redis = require("ioredis");

const redis = new Redis.Cluster([
  {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
  {
    scaleReads: "slave",
  },
]);

const app = express();

const port = 8081;

app.use(express.json());
app.use(express.urlencoded());

app.get("/read", async (req, res) => {
  const { key = "default" } = req.query;

  const value = await redis.get(key); // This query will be sent to one of the slaves.

  res.send({
    data: {
      key,
      value,
    },
  });
});

app.post("/write", async (req, res) => {
  const { key = "default", value = "default" } = req.body;

  await redis.set(key, value); // This query will be sent to one of the masters.

  res.send({
    data: {
      key,
      value,
    },
  });
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
