import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db";
import authRouter from "./routes/auth";
import studiosRouter from "./routes/studios";
import bookingsRouter from "./routes/bookings";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.send("StudioSpace server is running");
});

app.use("/api/auth", authRouter);
app.use("/api/studios", studiosRouter);
app.use("/api/bookings", bookingsRouter);

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