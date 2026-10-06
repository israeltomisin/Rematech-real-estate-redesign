import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("./.env", import.meta.url)), quiet: true });
// Create an instance of Express
const app = express();
const router = express.Router()
const PORT = process.env.PORT || 5000;
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
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
// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/", express.static("static"));



router.post('/send-email', async (req, res) => {
  const { name, email, subject, message } = req.body || {};

  if (![name, email, message].every((value) => typeof value === 'string' && value.trim())) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(503).json({ error: 'Email delivery is not configured' });
  }
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const selectedSubject = typeof subject === 'string' && subject.trim()
    ? subject.trim()
    : `Contact message from ${trimmedName}`;

  const mailOptions = {
    from: { name: trimmedName, address: process.env.EMAIL_USER },
    replyTo: trimmedEmail,
    to: 'israeltomisin001@gmail.com',
    subject: selectedSubject,
    text: [
      `Name: ${trimmedName}`,
      `Email: ${trimmedEmail}`,
      `Subject: ${selectedSubject}`,
      '',
      message,
    ].join('\n'),
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});
// Property enquiry endpoint
router.post('/property-enquiry', async (req, res) => {
  const {
    looking_to,
    property_type = '',
    location = '',
    price_range = '',
    hoping_to = '',
    message = '',
  } = req.body || {};
  const fields = { looking_to, property_type, location, price_range, hoping_to, message };

  if (Object.values(fields).some((value) => typeof value !== 'string')) {
    return res.status(400).json({ error: 'Property enquiry fields must be strings' });
  }
  if (!looking_to.trim()) {
    return res.status(400).json({ error: 'Please tell us what you are looking for' });
  }
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(503).json({ error: 'Email delivery is not configured' });
  }

  const propertyDetails = [
    ['Looking to', looking_to],
    ['Property type', property_type],
    ['Preferred location', location],
    ['Budget or price range', price_range],
    ['Moving timeframe', hoping_to],
    ['Additional details', message],
  ]
    .filter(([, value]) => value.trim())
    .map(([label, value]) => `${label}: ${value.trim()}`)
    .join('\n');

  try {
    const info = await emailTransporter.sendMail({
      from: { name: 'Rematech Property Enquiry', address: process.env.EMAIL_USER },
      to: 'israeltomisin001@gmail.com',
      subject: `Property enquiry: ${looking_to.trim()}`,
      text: propertyDetails,
    });

    console.log('Property enquiry sent:', info.response);
    res.status(200).json({ message: 'Your property enquiry has been sent successfully' });
    // res.redirect("/contact.html")
  } catch (error) {
    console.error('Error sending property enquiry:', error);
    res.status(500).json({ error: 'Failed to send property enquiry' });
  }
});

app.use("/api", router)

// Start the server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});