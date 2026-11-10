import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { email: string; name: string };
}

export function verifyToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.token;
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ message: "Server configuration error" });
    return;
  }

  if (!token) {
    res.status(401).json({ message: "Unauthorized: please log in first" });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as { email: string; name: string };
    req.user = { email: decoded.email, name: decoded.name };
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized: invalid or expired token" });
  }
}