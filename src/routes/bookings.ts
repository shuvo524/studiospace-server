import { Router, Response } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db";
import { verifyToken, AuthRequest } from "../middleware/verifyToken";

const router = Router();
const bookings = () => getDB().collection("bookings");

const CONFLICT_MESSAGE =
  "This time slot is already booked. Please choose a different time.";

function toMinutes(time: unknown): number | null {
  if (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return null;
  }
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Create a booking (protected)
router.post("/", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { studioId, date, startTime, endTime } = req.body;

    if (typeof studioId !== "string" || !ObjectId.isValid(studioId)) {
      res.status(400).json({ message: "Invalid studio id" });
      return;
    }

    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ message: "Please choose a valid date" });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (date < today) {
      res.status(400).json({ message: "You cannot book a past date" });
      return;
    }

    const startMinutes = toMinutes(startTime);
    const endMinutes = toMinutes(endTime);

    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      res.status(400).json({ message: "End time must be after start time" });
      return;
    }

    const studio = await getDB()
      .collection("studios")
      .findOne({ _id: new ObjectId(studioId) });

    if (!studio) {
      res.status(404).json({ message: "Studio not found" });
      return;
    }

    // Challenge 2: reject overlap with already confirmed bookings
    const conflict = await bookings().findOne({
      studioId,
      date,
      status: "Confirmed",
      startMinutes: { $lt: endMinutes },
      endMinutes: { $gt: startMinutes },
    });

    if (conflict) {
      res.status(409).json({ message: CONFLICT_MESSAGE });
      return;
    }

    const hours = (endMinutes - startMinutes) / 60;
    const totalPrice = Math.round(hours * studio.hourlyRate * 100) / 100;

    const newBooking = {
      studioId,
      studioTitle: studio.title,
      studioImage: studio.imageUrl,
      studioLocation: studio.location,
      hostEmail: studio.ownerEmail,
      userEmail: req.user!.email,
      userName: req.user!.name,
      date,
      startTime,
      endTime,
      startMinutes,
      endMinutes,
      hours,
      hourlyRate: studio.hourlyRate,
      securityDeposit: studio.securityDeposit || 0,
      totalPrice,
      status: "Pending",
      createdAt: new Date(),
    };

    const result = await bookings().insertOne(newBooking);
    res.status(201).json({
      message: "Booking request sent successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Failed to create booking:", error);
    res.status(500).json({ message: "Failed to create booking" });
  }
});

// My bookings (as a creator)
router.get("/my", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const myBookings = await bookings()
      .find({ userEmail: req.user!.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(myBookings);
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    res.status(500).json({ message: "Failed to fetch your bookings" });
  }
});

// Booking requests for my studios (as a host)
router.get("/host", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const hostBookings = await bookings()
      .find({ hostEmail: req.user!.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(hostBookings);
  } catch (error) {
    console.error("Failed to fetch host bookings:", error);
    res.status(500).json({ message: "Failed to fetch booking requests" });
  }
});

// Cancel my own pending booking
router.patch("/:id/cancel", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid booking id" });
      return;
    }

    const booking = await bookings().findOne({ _id: new ObjectId(id) });

    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    if (booking.userEmail !== req.user!.email) {
      res.status(403).json({ message: "You can only cancel your own bookings" });
      return;
    }

    if (booking.status !== "Pending") {
      res.status(400).json({ message: "Only pending bookings can be cancelled" });
      return;
    }

    await bookings().updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "Cancelled", updatedAt: new Date() } }
    );

    res.json({ message: "Booking cancelled successfully" });
  } catch (error) {
    console.error("Failed to cancel booking:", error);
    res.status(500).json({ message: "Failed to cancel booking" });
  }
});

// Host changes booking status (Confirmed / Completed / Cancelled)
router.patch("/:id/status", verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid booking id" });
      return;
    }

    if (!["Confirmed", "Completed", "Cancelled"].includes(status)) {
      res.status(400).json({ message: "Invalid status" });
      return;
    }

    const booking = await bookings().findOne({ _id: new ObjectId(id) });

    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    if (booking.hostEmail !== req.user!.email) {
      res.status(403).json({ message: "Only the studio host can update this booking" });
      return;
    }

    const transitions: Record<string, string[]> = {
      Pending: ["Confirmed", "Cancelled"],
      Confirmed: ["Completed", "Cancelled"],
      Completed: [],
      Cancelled: [],
    };

    if (!transitions[booking.status]?.includes(status)) {
      res.status(400).json({
        message: `A ${booking.status} booking cannot be changed to ${status}`,
      });
      return;
    }

    if (status === "Confirmed") {
      const conflict = await bookings().findOne({
        _id: { $ne: booking._id },
        studioId: booking.studioId,
        date: booking.date,
        status: "Confirmed",
        startMinutes: { $lt: booking.endMinutes },
        endMinutes: { $gt: booking.startMinutes },
      });

      if (conflict) {
        res.status(409).json({ message: CONFLICT_MESSAGE });
        return;
      }
    }

    await bookings().updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    res.json({ message: `Booking ${status.toLowerCase()} successfully` });
  } catch (error) {
    console.error("Failed to update booking status:", error);
    res.status(500).json({ message: "Failed to update booking status" });
  }
});

export default router;