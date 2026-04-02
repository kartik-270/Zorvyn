import { env } from "./env";
import { createApp } from "./expressApp";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

