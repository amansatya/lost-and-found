import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    googleUid: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
    },

    provider: {
      type: String,
      enum: ["email", "email_google"],
      default: "email",
    },

    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
