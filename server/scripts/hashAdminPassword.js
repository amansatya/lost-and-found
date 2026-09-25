import bcrypt from "bcryptjs";
import readline from "node:readline";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("Enter the admin password to hash: ", async (password) => {
  rl.close();

  if (!password || password.length < 8) {
    console.error("Admin password must be at least 8 characters.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  console.log("\nADMIN_PASSWORD_HASH=");
  console.log(hash);
});
