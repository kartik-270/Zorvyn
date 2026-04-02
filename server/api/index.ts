/**
 * Vercel serverless entry — do not use `src/index.ts` (app.listen) on Vercel.
 * Rewrites in vercel.json send all traffic here.
 *
 * Vercel's Express build step requires a top-level `import express` in this file.
 */
import express from "express";
import { createApp } from "../src/expressApp";

void express;
const app = createApp();
export default app;
