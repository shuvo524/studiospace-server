import crypto from "crypto";
import { Request, Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  };
}

// Only our own Next.js server knows this secret key.
function hasValidInternalKey(req: Request): boolean {
  const expected = process.env.INTERNAL_API_KEY;
  const received = req.header("x-internal-key");
  if (!expected || !received) return false;

  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

router.post("/jwt", (req, res) => {
  const secret = process.env.JWT_SECRET;

  if (!secret || !process.env.INTERNAL_API_KEY) {
    res.status(500).json({ message: "Server configuration error" });
    return;
  }

  if (!hasValidInternalKey(req)) {
    res.status(403).json({ message: "Forbidden: invalid internal key" });
    return;
  }

  const { email, name } = req.body;

  if (!email || typeof email !== "string") {
    res.status(400).json({ message: "Email is required" });
    return;
  }

  const token = jwt.sign({ email, name: name || "" }, secret, {
    expiresIn: "7d",
  });

  res
    .cookie("token", token, {
      ...getCookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json({ message: "Logged in successfully" });
});

router.post("/logout", (_req, res) => {
  res
    .clearCookie("token", getCookieOptions())
    .json({ message: "Logged out successfully" });
});

export default router;