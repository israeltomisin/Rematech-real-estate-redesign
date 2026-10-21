import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import db from "./db.js";

dotenv.config();

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;

if (!username || !password) {
  console.error("Please set ADMIN_USERNAME and ADMIN_PASSWORD in .env");
  process.exitCode = 1;
} else {
  try {
    const passwordHash = await bcrypt.hash(password, 12);

    await db.execute(
      `INSERT INTO admin_users (username, password_hash)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
      [username, passwordHash]
    );

    console.log(`Admin account "${username}" created or updated.`);
  } catch (error) {
    console.error("Could not create admin:", error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}
