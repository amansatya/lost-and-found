import dotenv from "dotenv";
import mongoose from "mongoose";
import Item from "../models/Item.js";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/lost-and-found";

const seedItems = [
  {
    status: "Lost",
    title: "Silver MacBook Air (13-inch)",
    category: "Electronics",
    location: "Library",
    date: "2026-07-21",
    description:
      "Left it on the 2nd floor reading desk near the window, silent study zone. Has a small dent on the top-left corner and a blue laptop skin on the lid.",
    contact: "priya.sharma@campusmail.edu",
    photo: "",
    rotation: -2,
    createdAt: "2026-07-21T14:32:00.000Z",
  },
  {
    status: "Found",
    title: "Bunch of keys with a red keychain",
    category: "Keys",
    location: "Cafeteria",
    date: "2026-07-22",
    description:
      "Found near table 6 by the window after lunch rush. Three keys and a small red rubber keychain shaped like a chili pepper. Handed to the cafeteria counter, ask for Ravi.",
    contact: "ravi.counter@campusmail.edu",
    photo: "",
    rotation: 3,
    createdAt: "2026-07-22T13:05:00.000Z",
  },
  {
    status: "Lost",
    title: "College ID card - Aditi Verma",
    category: "ID Cards",
    location: "Classroom Block",
    date: "2026-07-20",
    description:
      "Dropped somewhere between Room 204 and the stairwell on the 2nd floor. Name printed is Aditi Verma, Roll No. CS-2027-118.",
    contact: "aditi.verma@campusmail.edu",
    photo: "",
    rotation: -4,
    createdAt: "2026-07-20T09:15:00.000Z",
  },
  {
    status: "Found",
    title: "Navy blue backpack",
    category: "Bags",
    location: "Sports Complex",
    date: "2026-07-23",
    description:
      "Left on the bleachers after the evening badminton session. Contains a water bottle and a gym towel. Turned in at the sports complex front desk.",
    contact: "frontdesk.sports@campusmail.edu",
    photo: "",
    rotation: 2,
    createdAt: "2026-07-23T19:40:00.000Z",
  },
  {
    status: "Lost",
    title: "Wired earphones, white",
    category: "Electronics",
    location: "Hostel Block B",
    date: "2026-07-19",
    description:
      "Probably fell out of my bag near the common room or the 3rd floor corridor. White wired earphones, a bit of tape on the left bud wire.",
    contact: "kabir.singh@campusmail.edu",
    photo: "",
    rotation: -3,
    createdAt: "2026-07-19T21:10:00.000Z",
  },
  {
    status: "Found",
    title: "Textbook - Introduction to Thermodynamics",
    category: "Books",
    location: "Computer Lab",
    date: "2026-07-22",
    description:
      "Left on a workstation desk after the afternoon lab session. Has handwritten notes in the margins and a name 'S. Rao' on the inside cover.",
    contact: "lab.assistant@campusmail.edu",
    photo: "",
    rotation: 4,
    createdAt: "2026-07-22T16:50:00.000Z",
  },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);

  const existing = await Item.countDocuments();
  if (existing > 0) {
    console.log(`Items already exist (${existing}). Nothing was seeded.`);
    await mongoose.disconnect();
    return;
  }

  await Item.insertMany(
    seedItems.map((item) => ({
      ...item,
      active: true,
      owner: null,
      closedAt: null,
      closedBy: null,
    }))
  );

  console.log("✓ Seeded 6 initial board listings into MongoDB.");
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error("Item seed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
