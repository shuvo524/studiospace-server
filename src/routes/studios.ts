import { Router } from "express";
import { ObjectId } from "mongodb";
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

router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid studio id" });
      return;
    }

    const studio = await getDB()
      .collection("studios")
      .findOne({ _id: new ObjectId(id) });

    if (!studio) {
      res.status(404).json({ message: "Studio not found" });
      return;
    }

    res.json(studio);
  } catch (error) {
    console.error("Failed to fetch studio:", error);
    res.status(500).json({ message: "Failed to fetch studio" });
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
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid studio id" });
      return;
    }

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
    } = req.body;

    const updatedFields = {
      title,
      category,
      hourlyRate: Number(hourlyRate),
      securityDeposit: Number(securityDeposit) || 0,
      maxCapacity: Number(maxCapacity) || 1,
      location,
      imageUrl,
      amenities: Array.isArray(amenities) ? amenities : [],
      overview: overview || "",
      updatedAt: new Date(),
    };

    const result = await getDB()
      .collection("studios")
      .updateOne({ _id: new ObjectId(id) }, { $set: updatedFields });

    if (result.matchedCount === 0) {
      res.status(404).json({ message: "Studio not found" });
      return;
    }

    res.json({ message: "Studio updated successfully" });
  } catch (error) {
    console.error("Failed to update studio:", error);
    res.status(500).json({ message: "Failed to update studio" });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid studio id" });
      return;
    }

    const result = await getDB()
      .collection("studios")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      res.status(404).json({ message: "Studio not found" });
      return;
    }

    res.json({ message: "Studio deleted successfully" });
  } catch (error) {
    console.error("Failed to delete studio:", error);
    res.status(500).json({ message: "Failed to delete studio" });
  }
});
export default router;