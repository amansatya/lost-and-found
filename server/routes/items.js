import express from "express";
import mongoose from "mongoose";

import Item from "../models/Item.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const MAX_ACTIVE_ITEMS = 30;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateItemInput(body = {}) {
  const errors = {};

  if (!["Lost", "Found"].includes(body.status)) {
    errors.status = "Choose whether the item was lost or found.";
  }

  const title = normalizeString(body.title);
  if (!title) {
    errors.title = "Give the item a short, clear name.";
  } else if (title.length > 120) {
    errors.title = "Item name must be 120 characters or fewer.";
  }

  if (!normalizeString(body.category)) {
    errors.category = "Choose a category.";
  }

  if (!normalizeString(body.location)) {
    errors.location = "Choose a location.";
  }

  const date = normalizeString(body.date);

  if (!date) {
    errors.date = "Choose the date this happened.";
  } else {
    const parsedDate = new Date(`${date}T00:00:00`);
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate > today
    ) {
      errors.date =
          "The date cannot be in the future.";
    }
  }

  const description = normalizeString(body.description);
  if (!description) {
    errors.description = "Add a few details so people can recognize the item.";
  } else if (description.length > 2000) {
    errors.description = "Description must be 2000 characters or fewer.";
  }

  const contact = normalizeString(body.contact);
  if (!contact) {
    errors.contact = "Add an email or phone number so people can reach you.";
  } else if (contact.length > 160) {
    errors.contact = "Contact information must be 160 characters or fewer.";
  }

  return errors;
}

function publicItem(item) {
  return {
    id: item._id.toString(),
    status: item.status,
    title: item.title,
    category: item.category,
    location: item.location,
    date: item.date,
    description: item.description,
    contact: item.contact,
    photo: item.photo || "",
    active: item.active,
    ownerId: item.owner ? item.owner.toString() : null,
    rotation: item.rotation || 0,
    postedAt: item.createdAt,
    updatedAt: item.updatedAt,
    closedAt: item.closedAt,
  };
}

async function enforceActiveLimit() {
  const activeCount = await Item.countDocuments({ active: true });

  if (activeCount <= MAX_ACTIVE_ITEMS) {
    return null;
  }

  // Keep the newest 30 active listings. The oldest active listing is
  // soft-closed instead of being deleted.
  const oldest = await Item.findOne({
    active: true,
  }).sort({ createdAt: 1 });

  if (!oldest) return null;

  oldest.active = false;
  oldest.closedAt = new Date();
  await oldest.save();

  return oldest;
}

// GET /api/items
// Public: only active listings are returned.
router.get("/", async (_req, res) => {
  try {
    const items = await Item.find({ active: true })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      items: items.map(publicItem),
      count: items.length,
      maxActiveItems: MAX_ACTIVE_ITEMS,
    });
  } catch (err) {
    console.error("Failed to load items:", err);
    return res.status(500).json({
      success: false,
      message: "We couldn't load the board right now. Please try again.",
    });
  }
});

// GET /api/items/:id
// Public: inactive listings are intentionally hidden.
router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({
      success: false,
      message: "That listing could not be found.",
    });
  }

  try {
    const item = await Item.findOne({
      _id: req.params.id,
      active: true,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "This listing is no longer active or could not be found.",
      });
    }

    return res.json({
      success: true,
      item: publicItem(item),
    });
  } catch (err) {
    console.error("Failed to load item:", err);
    return res.status(500).json({
      success: false,
      message: "We couldn't load this listing. Please try again.",
    });
  }
});

// POST /api/items
// Authenticated users only.
router.post("/", requireAuth, async (req, res) => {
  const errors = validateItemInput(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: "Please check the highlighted fields.",
      errors,
    });
  }

  try {
    const item = await Item.create({
      status: req.body.status,
      title: normalizeString(req.body.title),
      category: normalizeString(req.body.category),
      location: normalizeString(req.body.location),
      date: normalizeString(req.body.date),
      description: normalizeString(req.body.description),
      contact: normalizeString(req.body.contact),
      photo: typeof req.body.photo === "string" ? req.body.photo : "",
      owner: req.user._id,
      active: true,
      rotation: Math.round((Math.random() - 0.5) * 8),
    });

    const agedOut = await enforceActiveLimit();

    return res.status(201).json({
      success: true,
      message: "Your listing is now live on the board.",
      item: publicItem(item),
      agedOutItemId: agedOut ? agedOut._id.toString() : null,
    });
  } catch (err) {
    console.error("Failed to create item:", err);
    return res.status(500).json({
      success: false,
      message: "We couldn't publish your listing. Please try again.",
    });
  }
});

// POST /api/items/:id/close
// Only the owner can close their listing.
router.post("/:id/close", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({
      success: false,
      message: "That listing could not be found.",
    });
  }

  try {
    const item = await Item.findOne({
      _id: req.params.id,
      active: true,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "This listing is already closed or no longer available.",
      });
    }

    if (!item.owner || item.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Only the person who posted this listing can close it.",
      });
    }

    item.active = false;
    item.closedAt = new Date();
    item.closedBy = req.user._id;

    await item.save();

    return res.json({
      success: true,
      message: "Listing closed. It has been removed from the active board.",
      item: publicItem(item),
    });
  } catch (err) {
    console.error("Failed to close item:", err);
    return res.status(500).json({
      success: false,
      message: "We couldn't close this listing. Please try again.",
    });
  }
});

export default router;
