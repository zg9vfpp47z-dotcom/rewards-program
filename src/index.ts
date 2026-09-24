import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3000);

const app = createApp();
app.listen(port, () => {
  process.stdout.write(`Rewards API listening on :${port}\n`);
});
