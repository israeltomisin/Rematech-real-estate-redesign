import db from "./db.js";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import nodemailer from "nodemailer";
import { fileURLToPath } from "node:url";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";

dotenv.config({
  path: fileURLToPath(new URL("./.env", import.meta.url)),
  quiet: true,
});

const app = express();
const router = express.Router();
const PORT = process.env.PORT || 8000;

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing from Backend/.env");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from Backend/.env");
}

// PostgreSQL session store
const PgSessionStore = connectPgSimple(session);

const sessionStore = new PgSessionStore({
  pool: db,
  tableName: "session",
  createTableIfMissing: true,
});

// Middleware
// Trust Render's proxy in production
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Allow requests from the deployed frontend
app.use(
  cors({
    origin: (origin, callback) => {
      const isLocalOrigin =
        typeof origin === "string" &&
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      const isDeployedOrigin =
        origin === "https://rematech-real-estate-redesign-stati.vercel.app";

      callback(null, !origin || isLocalOrigin || isDeployedOrigin);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PostgreSQL-backed admin sessions
app.use(
  session({
    name: "rematech.sid",
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 2,
    },
  })
);
// Email transporter
const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
  maxConnections: 2,
  maxMessages: 100,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});
emailTransporter.verify()
  .then(() => {
    console.log("Gmail SMTP connection verified successfully");
    console.log("SMTP Port:", emailTransporter.options.port || "default");
  })
  .catch((error) => {
    console.error("Gmail SMTP verification failed:", error.code, error.message);
  });
// Serve frontend files
const staticDirectory = fileURLToPath(new URL("../static", import.meta.url));
app.use("/", express.static(staticDirectory));

// Send contact email
router.post("/send-email", async (req, res) => {
  const { name, email, subject, message } = req.body || {};

  if (![name, email, message].every(
    value => typeof value === "string" && value.trim()
  )) {
    return res.status(400).json({
      error: "Name, email, and message are required",
    });
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(503).json({
      error: "Email delivery is not configured",
    });
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const selectedSubject =
    typeof subject === "string" && subject.trim()
      ? subject.trim()
      : `Contact message from ${trimmedName}`;

  try {
    const info = await emailTransporter.sendMail({
      from: {
        name: trimmedName,
        address: process.env.EMAIL_USER,
      },
      replyTo: trimmedEmail,
      to: "israeltomisin001@gmail.com",
      subject: selectedSubject,
      text: [
        `Name: ${trimmedName}`,
        `Email: ${trimmedEmail}`,
        `Subject: ${selectedSubject}`,
        "",
        message,
      ].join("\n"),
    });

    console.log("Email sent:", info.response);
    return res.status(200).json({
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("Error sending email:", error.message);
    return res.status(500).json({
      error: "Failed to send email",
    });
  }
});

// Property enquiry email
router.post("/property-enquiry", async (req, res) => {
  const {
    looking_to,
    property_type = "",
    location = "",
    price_range = "",
    hoping_to = "",
    message = "",
  } = req.body || {};

  const fields = {
    looking_to,
    property_type,
    location,
    price_range,
    hoping_to,
    message,
  };

  if (Object.values(fields).some(
    value => typeof value !== "string"
  )) {
    return res.status(400).json({
      error: "Property enquiry fields must be strings",
    });
  }

  if (!looking_to.trim()) {
    return res.status(400).json({
      error: "Please tell us what you are looking for",
    });
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(503).json({
      error: "Email delivery is not configured",
    });
  }

  const propertyDetails = [
    ["Looking to", looking_to],
    ["Property type", property_type],
    ["Preferred location", location],
    ["Budget or price range", price_range],
    ["Moving timeframe", hoping_to],
    ["Additional details", message],
  ]
    .filter(([, value]) => value.trim())
    .map(([label, value]) => `${label}: ${value.trim()}`)
    .join("\n");

  try {
    const info = await emailTransporter.sendMail({
      from: {
        name: "Rematech Property Enquiry",
        address: process.env.EMAIL_USER,
      },
      to: "israeltomisin001@gmail.com",
      subject: `Property enquiry: ${looking_to.trim()}`,
      text: propertyDetails,
    });

    console.log("Property enquiry sent:", info.response);
    return res.status(200).json({
      message: "Your property enquiry has been sent successfully",
    });
  } catch (error) {
    console.error("Error sending property enquiry:", error.message);
    return res.status(500).json({
      error: "Failed to send property enquiry",
    });
  }
});

// Get all properties (public)
router.get("/properties", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, property_type, location, price,
              description, image_url, status, created_at
       FROM properties
       ORDER BY created_at DESC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      properties: result.rows,
    });
  } catch (error) {
    console.error("Error fetching properties:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch properties",
    });
  }
});

// Admin login
router.post("/admin/login", async (req, res) => {
  const { username, password } = req.body || {};

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !username.trim() ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required",
    });
  }

  try {
    const result = await db.query(
      `SELECT id, username, password_hash
       FROM admin_users
       WHERE username = $1
       LIMIT 1`,
      [username.trim()]
    );

    const admin = result.rows[0];

    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    req.session.regenerate((error) => {
      if (error) {
        console.error("Session regeneration failed:", error.message);
        return res.status(500).json({
          success: false,
          message: "Could not start admin session",
        });
      }

      req.session.admin = {
        id: admin.id,
        username: admin.username,
      };

      req.session.save((saveError) => {
        if (saveError) {
          console.error("Session save failed:", saveError.message);
          return res.status(500).json({
            success: false,
            message: "Could not save admin session",
          });
        }

        return res.json({
          success: true,
          message: "Admin login successful",
          admin: req.session.admin,
        });
      });
    });
  } catch (error) {
    console.error("Admin login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Login failed due to a server error",
    });
  }
});

// Check admin session
router.get("/admin/me", (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({
      success: false,
      authenticated: false,
    });
  }

  return res.json({
    success: true,
    authenticated: true,
    admin: req.session.admin,
  });
});

// Admin logout
router.post("/admin/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Admin logout error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Logout failed",
      });
    }

    res.clearCookie("rematech.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  });
});

// Require admin authentication
function requireAdmin(req, res, next) {
  if (!req.session?.admin) {
    return res.status(401).json({
      success: false,
      message: "Please log in as an administrator.",
    });
  }

  next();
}

// Validate property input
function validateProperty(body) {
  const {
    title,
    property_type,
    location,
    price,
    description = "",
    image_url = "",
    status = "available",
  } = body || {};

  if (
    typeof title !== "string" || !title.trim() ||
    typeof property_type !== "string" || !property_type.trim() ||
    typeof location !== "string" || !location.trim() ||
    price === "" || price === null || price === undefined ||
    !Number.isFinite(Number(price)) || Number(price) < 0 ||
    typeof description !== "string" ||
    typeof image_url !== "string" ||
    typeof status !== "string" ||
    !["available", "sold", "rented", "unavailable"].includes(status)
  ) {
    return { error: "Please provide valid property details." };
  }

  if (
    title.trim().length > 255 ||
    property_type.trim().length > 100 ||
    location.trim().length > 255 ||
    image_url.length > 500 ||
    description.length > 10000
  ) {
    return { error: "One or more property fields are too long." };
  }

  return {
    value: {
      title: title.trim(),
      property_type: property_type.trim(),
      location: location.trim(),
      price: Number(price),
      description: description.trim(),
      image_url: image_url.trim(),
      status,
    },
  };
}

// Add a property — admin only
router.post("/admin/properties", requireAdmin, async (req, res) => {
  const validation = validateProperty(req.body);

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  try {
    const p = validation.value;

    const result = await db.query(
      `INSERT INTO properties
       (title, property_type, location, price, description, image_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        p.title,
        p.property_type,
        p.location,
        p.price,
        p.description,
        p.image_url,
        p.status,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Property added successfully.",
      id: result.rows[0].id,
    });
  } catch (error) {
    console.error("Add property error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not add property.",
    });
  }
});

// Edit a property — admin only
router.put("/admin/properties/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "Invalid property ID.",
    });
  }

  const validation = validateProperty(req.body);

  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  try {
    const p = validation.value;

    const result = await db.query(
      `UPDATE properties
       SET title = $1, property_type = $2, location = $3, price = $4,
           description = $5, image_url = $6, status = $7
       WHERE id = $8`,
      [
        p.title,
        p.property_type,
        p.location,
        p.price,
        p.description,
        p.image_url,
        p.status,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    return res.json({
      success: true,
      message: "Property updated successfully.",
    });
  } catch (error) {
    console.error("Edit property error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not update property.",
    });
  }
});

// Delete a property — admin only
router.delete("/admin/properties/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "Invalid property ID.",
    });
  }

  try {
    const result = await db.query(
      "DELETE FROM properties WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    return res.json({
      success: true,
      message: "Property deleted successfully.",
    });
  } catch (error) {
    console.error("Delete property error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not delete property.",
    });
  }
});

// Register API routes
app.use("/api", router);

// Basic health check
app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    return res.json({ success: true, database: "connected" });
  } catch (error) {
    console.error("Health check failed:", error.message);
    return res.status(503).json({
      success: false,
      database: "unavailable",
    });
  }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
