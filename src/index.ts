import "dotenv/config";
import express from "express";
import { connectDB } from "./config/db";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.get("/", (_req, res) => {
  res.send("StudioSpace server is running");
});

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});