/// <reference path="./types/express.d.ts" />

import "dotenv/config";
import { createRequire } from "node:module";
import express from "express";
import cors from "cors";
import type { RequestHandler } from "express";

import { notFoundMiddleware } from "./middlewares/not-found.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import routes from "./routes/index.js";
import connectDatabase from "./config/database.js";

const app = express();
const require = createRequire(import.meta.url);
const helmet = require("helmet") as () => RequestHandler;

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "SmartRecipe API is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", async (_req, _res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api", routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
