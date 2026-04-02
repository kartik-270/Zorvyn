/**
 * Vercel serverless entry — do not use `src/index.ts` (app.listen) on Vercel.
 * Rewrites in vercel.json send all traffic here.
 *
 * Do not use `src/app.ts` for the Express factory — Vercel treats `src/app` like Next.js App Router.
 */
import { createApp } from "../src/expressApp";

const app = createApp();
export default app;
