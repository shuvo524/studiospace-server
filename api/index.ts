import "dotenv/config";
import type { IncomingMessage, ServerResponse } from "http";
import app from "../src/app";
import { connectDB } from "../src/config/db";

// Vercel serverless entry point: every request is forwarded to the
// Express app (see the rewrites in vercel.json). The database connection
// is established once and then reused across warm invocations.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await connectDB();
    app(req as never, res as never);
  } catch (error) {
    console.error("Server error:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  }
}
