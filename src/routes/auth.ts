import { Router } from "express";
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

router.post("/jwt", (req, res) => {
  const { email, name } = req.body;
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ message: "Server configuration error" });
    return;
  }

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