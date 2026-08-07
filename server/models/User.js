import mongoose from "mongoose";

// Note: the `password` field always holds a bcrypt hash, never the
// plaintext password. Hashing happens in index.js before a document is
// ever created, so nothing plaintext touches the database.
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;