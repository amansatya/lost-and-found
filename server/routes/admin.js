import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import multer from "multer";
import { requireAdmin, createAdminToken, getAdminCookieOptions, clearAdminCookie } from "../middleware/adminAuth.js";
import User from "../models/User.js";
import Item from "../models/Item.js";
import PendingSignup from "../models/PendingSignup.js";
import PasswordReset from "../models/PasswordReset.js";
import { uploadImageBuffer, deleteImage } from "../services/cloudinaryService.js";
import { normalizeRollNo, validateStudentRollNo, isEmailForRollNo } from "../utils/kiit.js";
import { authRateLimits } from "../middleware/rateLimit.js";

const router = express.Router();

const adminUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

function optionalPhotoUpload(req, res, next) {
  adminUpload.single("photo")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "Image must be 2 MB or smaller." });
    }
    return res.status(400).json({ success: false, message: err.message || "Invalid image upload." });
  });
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isKiitEmail(email) {
  return /^[^\s@]+@kiit\.ac\.in$/i.test(email);
}

function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name || "",
    email: user.email,
    rollNo: user.rollNo || "",
    verified: Boolean(user.verified),
    provider: user.provider,
    googleLinked: Boolean(user.googleUid),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLogin: user.lastLogin,
  };
}

function serializeItem(item) {
  const owner = item.owner && typeof item.owner === "object" ? item.owner : null;
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
    photoPublicId: item.photoPublicId || "",
    active: Boolean(item.active),
    ownerId: owner?._id?.toString() || item.owner?.toString() || null,
    owner: owner
      ? { name: owner.name || "", email: owner.email || "", rollNo: owner.rollNo || "" }
      : null,
    closedAt: item.closedAt,
    closedBy: item.closedBy?.toString?.() || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function destroyCloudinaryImage(publicId) {
  if (!publicId) return;
  try {
    await deleteImage(publicId);
  } catch (err) {
    console.error("Failed to remove Cloudinary image:", publicId, err.message);
  }
}

function validateItemFields(body) {
  const errors = {};
  if (!["Lost", "Found"].includes(body.status)) errors.status = "Status must be Lost or Found.";
  if (!String(body.title || "").trim()) errors.title = "Title is required.";
  if (!String(body.category || "").trim()) errors.category = "Category is required.";
  if (!String(body.location || "").trim()) errors.location = "Location is required.";
  if (!String(body.date || "").trim()) errors.date = "Date is required.";
  if (!String(body.description || "").trim()) errors.description = "Description is required.";
  if (!String(body.contact || "").trim()) errors.contact = "Contact is required.";
  return errors;
}

// -----------------------------------------------------------------------------
// Admin authentication
// -----------------------------------------------------------------------------
router.post("/login", authRateLimits.login, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const configuredEmail = normalizeEmail(process.env.ADMIN_EMAIL);
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!configuredEmail || !passwordHash) {
    return res.status(503).json({
      success: false,
      message: "Admin credentials are not configured on the server.",
    });
  }

  if (!email || !password || email !== configuredEmail) {
    return res.status(401).json({ success: false, message: "Invalid admin credentials." });
  }

  const valid = await bcrypt.compare(password, passwordHash);
  if (!valid) {
    return res.status(401).json({ success: false, message: "Invalid admin credentials." });
  }

  res.cookie("board_admin_auth", createAdminToken(), getAdminCookieOptions());
  return res.json({ success: true, email: configuredEmail });
});

router.post("/logout", (_req, res) => {
  clearAdminCookie(res);
  return res.json({ success: true });
});

router.get("/me", requireAdmin, (req, res) => {
  return res.json({ success: true, admin: req.admin });
});

// -----------------------------------------------------------------------------
// Users
// -----------------------------------------------------------------------------
router.get("/users", requireAdmin, async (_req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, users: users.map(serializeUser) });
  } catch (err) {
    console.error("Admin users load failed:", err);
    return res.status(500).json({ success: false, message: "Couldn't load users." });
  }
});

router.put("/users/:id", requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  const { name, email, rollNo, verified, password } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  const normalizedRollNo = normalizeRollNo(rollNo);

  if (!String(name || "").trim()) {
    return res.status(400).json({ success: false, message: "Name is required." });
  }
  if (!isKiitEmail(normalizedEmail)) {
    return res.status(400).json({ success: false, message: "Only KIIT email addresses are allowed." });
  }

  const rollError = validateStudentRollNo(normalizedRollNo);
  if (rollError) return res.status(400).json({ success: false, message: rollError });
  if (!isEmailForRollNo(normalizedEmail, normalizedRollNo)) {
    return res.status(400).json({ success: false, message: "Email must exactly match the roll number (rollno@kiit.ac.in)." });
  }

  if (password !== undefined && password !== "" && String(password).length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const duplicate = await User.findOne({
      $or: [{ email: normalizedEmail }, { rollNo: normalizedRollNo }],
      _id: { $ne: user._id },
    }).lean();

    if (duplicate) {
      return res.status(409).json({ success: false, message: "Another user already uses that email or roll number." });
    }

    const emailChanged = user.email !== normalizedEmail;
    user.name = String(name).trim();
    user.email = normalizedEmail;
    user.rollNo = normalizedRollNo;
    user.verified = Boolean(verified);
    if (emailChanged) {
      user.googleUid = null;
      user.provider = "email";
    }
    if (password) user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();

    return res.json({ success: true, user: serializeUser(user) });
  } catch (err) {
    console.error("Admin user update failed:", err);
    return res.status(500).json({ success: false, message: "Couldn't update user." });
  }
});

router.delete("/users/:id", requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    // Preserve notices but remove ownership references to avoid dangling users.
    await Item.updateMany({ owner: user._id }, { $set: { owner: null } });
    await Item.updateMany({ closedBy: user._id }, { $set: { closedBy: null } });
    await PendingSignup.deleteMany({ email: user.email });
    await PasswordReset.deleteMany({ email: user.email });
    await user.deleteOne();

    return res.json({ success: true, message: "User deleted." });
  } catch (err) {
    console.error("Admin user deletion failed:", err);
    return res.status(500).json({ success: false, message: "Couldn't delete user." });
  }
});

// -----------------------------------------------------------------------------
// Items
// -----------------------------------------------------------------------------
router.get("/items", requireAdmin, async (_req, res) => {
  try {
    const items = await Item.find({})
      .populate("owner", "name email rollNo")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, items: items.map(serializeItem) });
  } catch (err) {
    console.error("Admin items load failed:", err);
    return res.status(500).json({ success: false, message: "Couldn't load items." });
  }
});

router.put("/items/:id", requireAdmin, optionalPhotoUpload, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ success: false, message: "Item not found." });
  }

  const errors = validateItemFields(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ success: false, message: "Please check the item fields.", errors });
  }

  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Item not found." });

    item.status = req.body.status;
    item.title = String(req.body.title).trim();
    item.category = String(req.body.category).trim();
    item.location = String(req.body.location).trim();
    item.date = String(req.body.date).trim();
    item.description = String(req.body.description).trim();
    item.contact = String(req.body.contact).trim();

    const oldPublicId = item.photoPublicId;
    let replacementUpload = null;
    if (req.file) {
      replacementUpload = await uploadImageBuffer(req.file.buffer, {
        public_id: `notice-${item.owner || "admin"}-${Date.now()}`,
      });
      item.photo = replacementUpload.secure_url;
      item.photoPublicId = replacementUpload.public_id;
    }

    if (typeof req.body.active === "string") {
      req.body.active = req.body.active === "true";
    }

    if (req.body.ownerId !== undefined) {
      const ownerId = String(req.body.ownerId || "").trim();
      if (!ownerId) {
        item.owner = null;
      } else if (!mongoose.isValidObjectId(ownerId)) {
        return res.status(400).json({ success: false, message: "Invalid owner account." });
      } else {
        const owner = await User.findById(ownerId).select("_id");
        if (!owner) {
          return res.status(400).json({ success: false, message: "Selected owner account does not exist." });
        }
        item.owner = owner._id;
      }
    }

    if (typeof req.body.active === "boolean") {
      item.active = req.body.active;
      if (item.active) {
        item.closedAt = null;
        item.closedBy = null;
      } else if (!item.closedAt) {
        item.closedAt = new Date();
      }
    }

    await item.save();

    if (replacementUpload && oldPublicId && oldPublicId !== replacementUpload.public_id) {
      await destroyCloudinaryImage(oldPublicId);
    }

    return res.json({ success: true, item: serializeItem(item) });
  } catch (err) {
    console.error("Admin item update failed:", err);
    return res.status(500).json({ success: false, message: "Couldn't update item." });
  }
});

router.delete("/items/:id", requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ success: false, message: "Item not found." });
  }

  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Item not found." });

    await destroyCloudinaryImage(item.photoPublicId);
    await item.deleteOne();

    return res.json({ success: true, message: "Item deleted." });
  } catch (err) {
    console.error("Admin item deletion failed:", err);
    return res.status(500).json({ success: false, message: "Couldn't delete item." });
  }
});

export default router;
