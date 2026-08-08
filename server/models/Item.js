import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Lost", "Found"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
      index: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    date: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    contact: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    photo: {
      type: String,
      default: "",
    },

    // The authenticated user who created the listing.
    // Seeded legacy/demo records may have no owner.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Soft-delete / active state.
    // We never physically remove a listing when it is closed
    // or aged out of the active 30-listing window.
    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    closedAt: {
      type: Date,
      default: null,
    },

    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rotation: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

itemSchema.index({ active: 1, createdAt: -1 });
itemSchema.index({ active: 1, status: 1, createdAt: -1 });

const Item = mongoose.model("Item", itemSchema);

export default Item;
