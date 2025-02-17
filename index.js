const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pool = require("./db/db");
require(const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pool = require("./db/db");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const app = express();
const PORT = 5000;
const SECRET_KEY = process.env.SECRET_KEY || "secret123";

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000", // Allow frontend to access the backend
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json());

// OTP setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
const otpStore = new Map();
const generateOTP = () => crypto.randomInt(100000, 999999);

// ----------------------------------------------------------------
// **Define authenticateToken BEFORE using it in routes**
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};
// ----------------------------------------------------------------

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the Doctor Availability and Appointment Booking API!");
});

// Health route
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS server_time");
    res.status(200).json({
      message: "Database connected successfully",
      server_time: result.rows[0].server_time,
    });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// 🔹 Fetch Available Doctors (Corrected Query)
app.get("/api/doctors", async (req, res) => {
  try {
    const doctors = await pool.query(
      `SELECT DISTINCT d.doctor_id, u.name AS doctor_name, 
              d.specialization, d.contact_number, d.clinic_address
       FROM doctors_table d
       JOIN users_table u ON d.user_id = u.user_id
       JOIN schedules_table s ON d.doctor_id = s.doctor_id
       WHERE s.slot_status = 'available'`
    );
    res.json(doctors.rows);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({ message: "Error fetching doctors" });
  }
});

// API for doctor view search by query (name or specialty)
app.get("/api/doctorview", async (req, res) => {
  const searchQuery = req.query.query || "";
  try {
    const doctors = await pool.query(
      `SELECT d.user_id, u.name, d.clinic_address AS location, d.specialization, d.rating 
       FROM doctors_table d
       JOIN users_table u ON d.user_id = u.user_id
       WHERE u.name ILIKE $1 OR d.specialization ILIKE $1`,
      [`%${searchQuery}%`]
    );
    res.json(doctors.rows);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({ message: "Error fetching doctors" });
  }
});

// 🔹 Fetch Appointments (Protected)
app.get("/api/appointments", authenticateToken, async (req, res) => {
  try {
    const appointments = await pool.query(
      `SELECT a.appointment_id, d.doctor_id, 
              u1.name AS doctor_name, u2.name AS patient_name,
              d.specialization AS specialization,
              a.appointment_date, a.appointment_time, a.status
       FROM appointments_table a
       JOIN doctors_table d ON a.doctor_id = d.doctor_id
       JOIN users_table u1 ON d.user_id = u1.user_id
       JOIN users_table u2 ON a.patient_id = u2.user_id
       WHERE a.patient_id = $1 
         AND a.appointment_date >= CURRENT_DATE
       ORDER BY a.appointment_date, a.appointment_time;`,
      [req.user.userId]
    );
    res.json(appointments.rows);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ message: "Error fetching appointments" });
  }
});

// API 1: Search Doctor by Name
app.get("/api/doctorview/search", async (req, res) => {
  const doctorName = req.query.name || "";
  try {
    const doctors = await pool.query(
      `SELECT d.user_id, u.name, d.clinic_address AS location, d.specialization, d.rating 
       FROM doctors_table d
       JOIN users_table u ON d.user_id = u.user_id
       WHERE u.name ILIKE $1`,
      [`%${doctorName}%`]
    );
    res.json(doctors.rows);
  } catch (error) {
    console.error("Error fetching doctors by name:", error);
    res.status(500).json({ message: "Error fetching doctors" });
  }
});

// API 2: Filter Doctors by Specialty
app.get("/api/doctorview/specialty", async (req, res) => {
  const specialty = req.query.specialty || "";
  try {
    let query = `SELECT d.user_id, u.name, d.clinic_address AS location, d.specialization, d.rating 
                 FROM doctors_table d
                 JOIN users_table u ON d.user_id = u.user_id`;
    let values = [];
    if (specialty) {
      query += ` WHERE d.specialization ILIKE $1`;
      values.push(`%${specialty}%`);
    }
    const doctors = await pool.query(query, values);
    res.json(doctors.rows);
  } catch (error) {
    console.error("Error fetching doctors by specialty:", error);
    res.status(500).json({ message: "Error fetching doctors" });
  }
});

// OTP & Password Reset Endpoints
app.post('/api/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    const storedOtp = otpStore.get(email);
    if (!storedOtp || storedOtp.otp !== parseInt(otp)) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    if (Date.now() > storedOtp.expires) {
      otpStore.delete(email);
      return res.status(400).json({ error: "OTP expired" });
    }
    res.status(200).json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ error: "OTP verification failed" });
  }
});

app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await pool.query('SELECT * FROM users_table WHERE email = $1', [email]);
    if (!user.rows.length) return res.status(404).json({ error: "Email not registered" });

    const otp = generateOTP();
    otpStore.set(email, { otp, expires: Date.now() + 300000 }); // 5 minutes expiry

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}`
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("OTP send error:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const storedOtp = otpStore.get(email);
    if (!storedOtp || storedOtp.otp !== parseInt(otp)) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    if (Date.now() > storedOtp.expires) {
      otpStore.delete(email);
      return res.status(400).json({ error: "OTP expired" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users_table SET password_hash = $1 WHERE email = $2', [hashedPassword, email]);
    otpStore.delete(email);
    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password reset error:", err);
    res.status(500).json({ error: "Password reset failed" });
  }
});

// Register endpoints
app.post("/api/register", async (req, res) => {
  const { name, email, phone_number, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      `INSERT INTO users_table 
       (name, email, phone_number, password_hash, role) 
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id`,
      [name, email, phone_number, hashedPassword, role]
    );
    res.status(201).json({ 
      message: "User registered successfully",
      userId: result.rows[0].user_id
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Error registering user" });
  }
});

app.post("/api/register/doctor", async (req, res) => {
  const { userId, specialization, contactNumber, clinicAddress } = req.body;
  try {
    await pool.query(
      "INSERT INTO doctors_table (user_id, specialization, contact_number, clinic_address) VALUES ($1, $2, $3, $4)",
      [userId, specialization, contactNumber, clinicAddress]
    );
    res.status(201).json({ message: "Doctor registered successfully" });
  } catch (err) {
    console.error("Doctor registration error:", err);
    res.status(500).json({ error: "Error registering doctor" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users_table WHERE email = $1", [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: "Invalid email or password" });
    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (passwordMatch) {
      const token = jwt.sign(
        { userId: user.user_id, role: user.role, email: user.email },
        SECRET_KEY,
        { expiresIn: "1h" }
      );
      res.status(200).json({ token, role: user.role });
    } else {
      res.status(401).json({ error: "Invalid email or password" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error logging in" });
  }
});

// API to fetch available slots
app.get("/available-slots", async (req, res) => {
  try {
    const { doctor_id, date } = req.query;
    // Query the appointments_table using appointment_date and appointment_time
    const result = await pool.query(
      "SELECT appointment_time FROM appointments_table WHERE doctor_id = $1 AND appointment_date = $2",
      [doctor_id, date]
    );
    const bookedSlots = result.rows.map((row) => row.appointment_time);
    const allSlots = [
      "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", 
      "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"
    ];
    const availableSlots = allSlots.filter((slot) => !bookedSlots.includes(slot));
    res.json(availableSlots);
  } catch (err) {
    console.error("Error fetching available slots:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// API to book an appointment
app.post("/book-appointment", async (req, res) => {
  try {
    const { email, fullName, doctor, date, time, detail } = req.body;
    // Look up the doctor by joining doctors_table and users_table by name
    const doctorResult = await pool.query(
      "SELECT d.doctor_id FROM doctors_table d JOIN users_table u ON d.user_id = u.user_id WHERE u.name = $1",
      [doctor]
    );
    if (doctorResult.rowCount === 0) {
      return res.status(400).json({ error: "Doctor not found" });
    }
    const doctor_id = doctorResult.rows[0].doctor_id;
    // Check if the time slot is already booked in appointments_table
    const checkSlot = await pool.query(
      "SELECT * FROM appointments_table WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3",
      [doctor_id, date, time]
    );
    if (checkSlot.rowCount > 0) {
      return res.status(400).json({ error: "Time slot already booked" });
    }
    // Insert the new appointment into appointments_table using the proper column names
    await pool.query(
      "INSERT INTO appointments_table (email, full_name, doctor_id, appointment_date, appointment_time, detail) VALUES ($1, $2, $3, $4, $5, $6)",
      [email, fullName, doctor_id, date, time, detail]
    );
    res.json({ message: "Appointment booked successfully!" });
  } catch (err) {
    console.error("Error booking appointment:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// Secure route example
app.get("/api/home", authenticateToken, (req, res) => {
  res.json({ message: `Welcome, user ${req.user.userId}` });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
"dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const app = express();
const PORT = 5000;
const SECRET_KEY = process.env.SECRET_KEY || "secret123";

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000", // Allow frontend to access the backend
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json());

// OTP setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
const otpStore = new Map();
const generateOTP = () => crypto.randomInt(100000, 999999);

// ----------------------------------------------------------------
// **Define authenticateToken BEFORE using it in routes**
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};
// ----------------------------------------------------------------

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the Doctor Availability and Appointment Booking API!");
});

// Health route
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS server_time");
    res.status(200).json({
      message: "Database connected successfully",
      server_time: result.rows[0].server_time,
    });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// 🔹 Fetch Available Doctors (Corrected Query)
app.get("/api/doctors", async (req, res) => {
  try {
    const doctors = await pool.query(
      `SELECT DISTINCT d.doctor_id, u.name AS doctor_name, 
              d.specialization, d.contact_number, d.clinic_address
       FROM doctors_table d
       JOIN users_table u ON d.user_id = u.user_id
       JOIN schedules_table s ON d.doctor_id = s.doctor_id
       WHERE s.slot_status = 'available'`
    );
    res.json(doctors.rows);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({ message: "Error fetching doctors" });
  }
});

// API for doctor view search by query (name or specialty)
app.get("/api/doctorview", async (req, res) => {
  const searchQuery = req.query.query || "";
  try {
    const doctors = await pool.query(
      `SELECT d.user_id, u.name, d.clinic_address AS location, d.specialization, d.rating 
       FROM doctors_table d
       JOIN users_table u ON d.user_id = u.user_id
       WHERE u.name ILIKE $1 OR d.specialization ILIKE $1`,
      [`%${searchQuery}%`]
    );
    res.json(doctors.rows);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({ message: "Error fetching doctors" });
  }
});

// 🔹 Fetch Appointments (Protected)
app.get("/api/appointments", authenticateToken, async (req, res) => {
  try {
    const appointments = await pool.query(
      `SELECT a.appointment_id, d.doctor_id, 
              u1.name AS doctor_name, u2.name AS patient_name,
              d.specialization AS specialization,
              a.appointment_date, a.appointment_time, a.status
       FROM appointments_table a
       JOIN doctors_table d ON a.doctor_id = d.doctor_id
       JOIN users_table u1 ON d.user_id = u1.user_id
       JOIN users_table u2 ON a.patient_id = u2.user_id
       WHERE a.patient_id = $1 
         AND a.appointment_date >= CURRENT_DATE
       ORDER BY a.appointment_date, a.appointment_time;`,
      [req.user.userId]
    );
    res.json(appointments.rows);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ message: "Error fetching appointments" });
  }
});

// API 1: Search Doctor by Name
app.get("/api/doctorview/search", async (req, res) => {
  const doctorName = req.query.name || "";
  try {
    const doctors = await pool.query(
      `SELECT d.user_id, u.name, d.clinic_address AS location, d.specialization, d.rating 
       FROM doctors_table d
       JOIN users_table u ON d.user_id = u.user_id
       WHERE u.name ILIKE $1`,
      [`%${doctorName}%`]
    );
    res.json(doctors.rows);
  } catch (error) {
    console.error("Error fetching doctors by name:", error);
    res.status(500).json({ message: "Error fetching doctors" });
  }
});

// API 2: Filter Doctors by Specialty
app.get("/api/doctorview/specialty", async (req, res) => {
  const specialty = req.query.specialty || "";
  try {
    let query = `SELECT d.user_id, u.name, d.clinic_address AS location, d.specialization, d.rating 
                 FROM doctors_table d
                 JOIN users_table u ON d.user_id = u.user_id`;
    let values = [];
    if (specialty) {
      query += ` WHERE d.specialization ILIKE $1`;
      values.push(`%${specialty}%`);
    }
    const doctors = await pool.query(query, values);
    res.json(doctors.rows);
  } catch (error) {
    console.error("Error fetching doctors by specialty:", error);
    res.status(500).json({ message: "Error fetching doctors" });
  }
});

// OTP & Password Reset Endpoints
app.post('/api/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    const storedOtp = otpStore.get(email);
    if (!storedOtp || storedOtp.otp !== parseInt(otp)) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    if (Date.now() > storedOtp.expires) {
      otpStore.delete(email);
      return res.status(400).json({ error: "OTP expired" });
    }
    res.status(200).json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ error: "OTP verification failed" });
  }
});

app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await pool.query('SELECT * FROM users_table WHERE email = $1', [email]);
    if (!user.rows.length) return res.status(404).json({ error: "Email not registered" });

    const otp = generateOTP();
    otpStore.set(email, { otp, expires: Date.now() + 300000 }); // 5 minutes expiry

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}`
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("OTP send error:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const storedOtp = otpStore.get(email);
    if (!storedOtp || storedOtp.otp !== parseInt(otp)) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    if (Date.now() > storedOtp.expires) {
      otpStore.delete(email);
      return res.status(400).json({ error: "OTP expired" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users_table SET password_hash = $1 WHERE email = $2', [hashedPassword, email]);
    otpStore.delete(email);
    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password reset error:", err);
    res.status(500).json({ error: "Password reset failed" });
  }
});

// Register endpoints
app.post("/api/register", async (req, res) => {
  const { name, email, phone_number, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      `INSERT INTO users_table 
       (name, email, phone_number, password_hash, role) 
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id`,
      [name, email, phone_number, hashedPassword, role]
    );
    res.status(201).json({ 
      message: "User registered successfully",
      userId: result.rows[0].user_id
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Error registering user" });
  }
});

app.post("/api/register/doctor", async (req, res) => {
  const { userId, specialization, contactNumber, clinicAddress } = req.body;
  try {
    await pool.query(
      "INSERT INTO doctors_table (user_id, specialization, contact_number, clinic_address) VALUES ($1, $2, $3, $4)",
      [userId, specialization, contactNumber, clinicAddress]
    );
    res.status(201).json({ message: "Doctor registered successfully" });
  } catch (err) {
    console.error("Doctor registration error:", err);
    res.status(500).json({ error: "Error registering doctor" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users_table WHERE email = $1", [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: "Invalid email or password" });
    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (passwordMatch) {
      const token = jwt.sign(
        { userId: user.user_id, role: user.role, email: user.email },
        SECRET_KEY,
        { expiresIn: "1h" }
      );
      res.status(200).json({ token, role: user.role });
    } else {
      res.status(401).json({ error: "Invalid email or password" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error logging in" });
  }
});



// Book an Appointment
app.post("/api/book-appointment", async (req, res) => {
  const { email, fullName, doctor, date, detail } = req.body;

  if (!email || !fullName || !doctor || !date) {
    return res.status(400).json({ error: "All fields except detail are required." });
  }

  try {
    const result = await pool.query(
      "INSERT INTO appointments_table (doctor_id, patient_id, appointment_date, appointment_time, status) VALUES ((SELECT doctor_id FROM doctors_table WHERE user_id = (SELECT user_id FROM users_table WHERE name = $1)), (SELECT user_id FROM users_table WHERE email = $2), $3, '10:00:00', 'booked') RETURNING *",
      [doctor, email, date]
    );

    res.json({ success: true, appointment: result.rows[0] });
  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});




// Secure route example
app.get("/api/home", authenticateToken, (req, res) => {
  res.json({ message: `Welcome, user ${req.user.userId}` });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
