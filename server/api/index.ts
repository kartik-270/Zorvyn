/**
 * Vercel serverless entry — do not use `src/index.ts` (app.listen) on Vercel.
 * All routes are rewritten here; see ../vercel.json
 */
import { createApp } from "../src/app";

const app = createApp();
export default app;
