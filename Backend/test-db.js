import db from "./db.js";

try {
  const result = await db.query("SELECT 1 AS result");

  console.log("Database connected successfully!");
  console.log(result.rows);
} catch (error) {
  console.error("Database connection failed:", error.message);
} finally {
  await db.end();
}