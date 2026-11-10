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

router.post("/", async (req, res) => {
  try {
    const {
      title,
      category,
      hourlyRate,
      securityDeposit,
      maxCapacity,
      location,
      imageUrl,
      amenities,
      overview,
      ownerEmail,
      ownerName,
    } = req.body;

    if (!title || !category || !hourlyRate || !location || !imageUrl || !ownerEmail) {
      res.status(400).json({ message: "Please fill in all required fields" });
      return;
    }

    const newStudio = {
      title,
      category,
      hourlyRate: Number(hourlyRate),
      securityDeposit: Number(securityDeposit) || 0,
      maxCapacity: Number(maxCapacity) || 1,
      location,
      imageUrl,
      amenities: Array.isArray(amenities) ? amenities : [],
      overview: overview || "",
      ownerEmail,
      ownerName: ownerName || "",
      rating: 0,
      createdAt: new Date(),
    };

    const result = await getDB().collection("studios").insertOne(newStudio);
    res.status(201).json({
      message: "Studio added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Failed to add studio:", error);
    res.status(500).json({ message: "Failed to add studio" });
  }
});

export default router;