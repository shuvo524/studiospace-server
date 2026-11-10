import { Router } from "express";
import { getDB } from "../config/db";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const studios = await getDB().collection("studios").find().toArray();
    res.json(studios);
  } catch (error) {
    console.error("Failed to fetch studios:", error);
    res.status(500).json({ message: "Failed to fetch studios" });
  }
});

export default router;