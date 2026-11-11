import { Router, Response } from "express";
import { ObjectId, Filter, Document } from "mongodb";
import { getDB } from "../config/db";
import { verifyToken, AuthRequest } from "../middleware/verifyToken";

const router = Router();
const studios = () => getDB().collection("studios");
// Keeps only valid http(s) links and allows at most 5 extra images.
function cleanGallery(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const links: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const link = item.trim();
    try {
      const url = new URL(link);
      if (url.protocol === "http:" || url.protocol === "https:") {
        links.push(link);
      }
    } catch {
      // ignore invalid links
    }
  }
  return links.slice(0, 5);
}

// All studios (search, category filter, sort, limit)
router.get("/", async (req, res) => {
  try {
    const { category, search, sort, limit } = req.query;
    const filter: Filter<Document> = {};

    if (typeof category === "string" && category && category !== "All") {
      filter.category = category;
    }

    if (typeof search === "string" && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { location: { $regex: escaped, $options: "i" } },
      ];
    }

    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === "rating") sortOption = { rating: -1, createdAt: -1 };
    else if (sort === "priceLow") sortOption = { hourlyRate: 1 };
    else if (sort === "priceHigh") sortOption = { hourlyRate: -1 };

    const cursor = studios().find(filter).sort(sortOption);
    const limitNumber = Number(limit);
    if (limitNumber > 0) cursor.limit(limitNumber);

    res.json(await cursor.toArray());
  } catch (error) {
    console.error("Failed to fetch studios:", error);
    res.status(500).json({ message: "Failed to fetch studios" });
  }
});

// Studios owned by the logged-in user
router.get("/my/listings", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const myStudios = await studios()
      .find({ ownerEmail: req.user!.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(myStudios);
  } catch (error) {
    console.error("Failed to fetch listings:", error);
    res.status(500).json({ message: "Failed to fetch your listings" });
  }
});

// Single studio
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid studio id" });
      return;
    }

    const studio = await studios().findOne({ _id: new ObjectId(id) });

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

// Create studio (protected)
router.post("/", verifyToken, async (req: AuthRequest, res: Response) => {
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
      gallery,
      overview,
      cancellationPolicy,
    } = req.body;

    if (!title || !category || !hourlyRate || !location || !imageUrl) {
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
      cancellationPolicy:
        typeof cancellationPolicy === "string" && cancellationPolicy.trim()
          ? cancellationPolicy.trim()
          : "Flexible — free cancellation up to 24 hours before the session",
      gallery: cleanGallery(gallery),
      ownerEmail: req.user!.email,
      ownerName: req.user!.name,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
    };

    const result = await studios().insertOne(newStudio);
    res.status(201).json({
      message: "Studio added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Failed to add studio:", error);
    res.status(500).json({ message: "Failed to add studio" });
  }
});

// Update studio (protected, owner only)
router.put("/:id", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid studio id" });
      return;
    }

    const studio = await studios().findOne({ _id: new ObjectId(id) });

    if (!studio) {
      res.status(404).json({ message: "Studio not found" });
      return;
    }

    if (studio.ownerEmail !== req.user!.email) {
      res.status(403).json({ message: "You can only edit your own studios" });
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
      gallery,
      overview,
      cancellationPolicy,
    } = req.body;

    await studios().updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          title,
          category,
          hourlyRate: Number(hourlyRate),
          securityDeposit: Number(securityDeposit) || 0,
          maxCapacity: Number(maxCapacity) || 1,
          location,
          imageUrl,
          amenities: Array.isArray(amenities) ? amenities : [],
          overview: overview || "",
          cancellationPolicy:
            typeof cancellationPolicy === "string" && cancellationPolicy.trim()
              ? cancellationPolicy.trim()
              : "Flexible — free cancellation up to 24 hours before the session",
          gallery: cleanGallery(gallery),
          updatedAt: new Date(),
        },
      }
    );

    res.json({ message: "Studio updated successfully" });
  } catch (error) {
    console.error("Failed to update studio:", error);
    res.status(500).json({ message: "Failed to update studio" });
  }
});

// Delete studio (protected, owner only)
router.delete("/:id", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid studio id" });
      return;
    }

    const studio = await studios().findOne({ _id: new ObjectId(id) });

    if (!studio) {
      res.status(404).json({ message: "Studio not found" });
      return;
    }

    if (studio.ownerEmail !== req.user!.email) {
      res.status(403).json({ message: "You can only delete your own studios" });
      return;
    }

    await studios().deleteOne({ _id: new ObjectId(id) });
    res.json({ message: "Studio deleted successfully" });
  } catch (error) {
    console.error("Failed to delete studio:", error);
    res.status(500).json({ message: "Failed to delete studio" });
  }
});

// Reviews of a studio
router.get("/:id/reviews", async (req, res) => {
  try {
    const reviews = await getDB()
      .collection("reviews")
      .find({ studioId: req.params.id })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(reviews);
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

// Add or update my review (protected)
router.post("/:id/reviews", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid studio id" });
      return;
    }

    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || "").trim();

    if (!(rating >= 1 && rating <= 5) || !comment) {
      res.status(400).json({ message: "Please give a rating (1-5) and a comment" });
      return;
    }

    const studio = await studios().findOne({ _id: new ObjectId(id) });
    if (!studio) {
      res.status(404).json({ message: "Studio not found" });
      return;
    }

    const reviews = getDB().collection("reviews");
    await reviews.updateOne(
      { studioId: id, userEmail: req.user!.email },
      {
        $set: {
          studioId: id,
          userEmail: req.user!.email,
          userName: req.user!.name,
          rating,
          comment,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    const stats = await reviews
      .aggregate([
        { $match: { studioId: id } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ])
      .toArray();

    const average = stats[0]?.avg ?? 0;
    const count = stats[0]?.count ?? 0;

    await studios().updateOne(
      { _id: new ObjectId(id) },
      { $set: { rating: Math.round(average * 10) / 10, reviewCount: count } }
    );

    res.status(201).json({ message: "Review submitted successfully" });
  } catch (error) {
    console.error("Failed to submit review:", error);
    res.status(500).json({ message: "Failed to submit review" });
  }
});

export default router;