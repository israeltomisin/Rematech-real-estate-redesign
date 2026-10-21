import db from "./db.js";

try {
  const [rows] = await db.query("SELECT 1 AS result");

  console.log("Database connected successfully!");
  console.log(rows);
} catch (error) {
  console.error("Database connection failed:", error.message);
} finally {
  await db.end();
}