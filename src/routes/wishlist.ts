import { Router, Response } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db";
import { verifyToken, AuthRequest } from "../middleware/verifyToken";

const router = Router();
const wishlist = () => getDB().collection("wishlist");

// IDs of my saved studios (to fill the hearts)
router.get("/ids", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const items = await wishlist().find({ userEmail: req.user!.email }).toArray();
    res.json(items.map((item) => item.studioId));
  } catch (error) {
    console.error("Failed to fetch wishlist ids:", error);
    res.status(500).json({ message: "Failed to fetch wishlist" });
  }
});

// My saved studios (full details)
router.get("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const items = await wishlist()
      .find({ userEmail: req.user!.email })
      .sort({ createdAt: -1 })
      .toArray();

    const ids = items
      .filter((item) => ObjectId.isValid(item.studioId))
      .map((item) => new ObjectId(item.studioId));

    const saved = await getDB()
      .collection("studios")
      .find({ _id: { $in: ids } })
      .toArray();

    res.json(saved);
  } catch (error) {
    console.error("Failed to fetch wishlist:", error);
    res.status(500).json({ message: "Failed to fetch wishlist" });
  }
});

// Save / remove a studio (toggle)
router.post("/:studioId", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const studioId = req.params.studioId;

    if (!ObjectId.isValid(studioId)) {
      res.status(400).json({ message: "Invalid studio id" });
      return;
    }

    const studio = await getDB()
      .collection("studios")
      .findOne({ _id: new ObjectId(studioId) });

    if (!studio) {
      res.status(404).json({ message: "Studio not found" });
      return;
    }

    const userEmail = req.user!.email;
    const existing = await wishlist().findOne({ userEmail, studioId });

    if (existing) {
      await wishlist().deleteOne({ _id: existing._id });
      res.json({ saved: false, message: "Removed from wishlist" });
      return;
    }

    await wishlist().insertOne({ userEmail, studioId, createdAt: new Date() });
    res.status(201).json({ saved: true, message: "Saved to wishlist" });
  } catch (error) {
    console.error("Failed to update wishlist:", error);
    res.status(500).json({ message: "Failed to update wishlist" });
  }
});

export default router;