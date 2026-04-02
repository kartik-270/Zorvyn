import express from "express";
import { env } from "./env";
import { createApp } from "./expressApp";

void express;

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

