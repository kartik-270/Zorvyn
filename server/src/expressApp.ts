import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./env";
import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import recordsRouter from "./routes/records";
import dashboardRouter from "./routes/dashboard";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: false,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/records", recordsRouter);
  app.use("/dashboard", dashboardRouter);

  app.use(errorHandler);

  return app;
}
