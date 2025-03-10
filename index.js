const express = require("express");
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
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  
  // Extract token from "Bearer <token>"
  const token = authHeader.split(" ")[1];
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

// Available slots endpoint
app.get("/api/available-slots", async (req, res) => {
  try {
    const { doctor_id, date } = req.query;
    const { rows } = await pool.query(`
      SELECT s.slot_time 
      FROM schedules_table s
      LEFT JOIN appointments_table a 
        ON s.doctor_id = a.doctor_id 
        AND s.slot_date = a.appointment_date 
        AND s.slot_time = a.appointment_time
      WHERE s.doctor_id = $1 
        AND s.slot_date = $2 
        AND a.appointment_id IS NULL`,
      [doctor_id, date]);
    res.json(rows.map(r => r.slot_time));
  } catch (error) {
    console.error("Error fetching slots:", error);
    res.status(500).json({ error: "Error fetching slots" });
  }
});


// Express and pg are assumed to be already set up.
app.get("/api/available-slot", async (req, res) => {
  try {
    const { doctor_id, date } = req.query;
    const result = await pool.query(
      `SELECT * FROM schedules_table WHERE doctor_id = $1 AND available_date = $2`,
      [doctor_id, date]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching available slots:", error);
    res.status(500).json({ error: "Failed to fetch slots" });
  }
});



// Helper: Convert 12-hour time (e.g., "10:00 AM") to 24-hour format ("10:00:00")
function convertTime12to24(time12h) {
  const [time, modifier] = time12h.split(" ");
  let [hours, minutes] = time.split(":");
  if (modifier.toUpperCase() === "PM" && hours !== "12") {
    hours = (parseInt(hours, 10) + 12).toString();
  }
  if (modifier.toUpperCase() === "AM" && hours === "12") {
    hours = "00";
  }
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00`;
}

app.post("/api/book-appointment", authenticateToken, async (req, res) => {
  try {
    // Expecting doctor's user id in the field "doctor" in the request body
    const { doctor, date, time, details } = req.body;
    const patient_id = req.user.userId; // Extracted from JWT token

    if (!doctor || !date || !time) {
      return res.status(400).json({ error: "Missing required fields: doctor, date, or time." });
    }

    // First, convert doctor's user_id to doctor_id from doctors_table
    const doctorResult = await pool.query(
      "SELECT doctor_id FROM doctors_table WHERE user_id = $1",
      [doctor]
    );
    if (doctorResult.rowCount === 0) {
      return res.status(404).json({ error: "Doctor not found" });
    }
    const doctor_id = doctorResult.rows[0].doctor_id;

    // Convert provided time (assumed in 12-hour format) to 24-hour format
    const convertedTime = convertTime12to24(time);
    console.log("Booking Attempt:", { doctor_id, date, originalTime: time, convertedTime });

    // Attempt to find an available slot for this doctor on the given date and time
    let slotCheck = await pool.query(
      `SELECT * FROM schedules_table 
       WHERE doctor_id = $1 
         AND available_date = $2 
         AND start_time = $3 
         AND slot_status = 'available'`,
      [doctor_id, date, convertedTime]
    );

    // If no slot is found, try to populate the schedule for this doctor on the given date
    if (slotCheck.rowCount === 0) {
      await populateScheduleForDoctorForDate(doctor_id, date);
      slotCheck = await pool.query(
        `SELECT * FROM schedules_table 
         WHERE doctor_id = $1 
           AND available_date = $2 
           AND start_time = $3 
           AND slot_status = 'available'`,
        [doctor_id, date, convertedTime]
      );
    }

    console.log("Slot Check Rows:", slotCheck.rows);

    if (slotCheck.rowCount === 0) {
      return res.status(400).json({ error: "Selected time slot is no longer available" });
    }

    // Create the appointment
    const result = await pool.query(
      `INSERT INTO appointments_table 
       (doctor_id, patient_id, appointment_date, appointment_time, details)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [doctor_id, patient_id, date, convertedTime, details]
    );

    // Update the schedule slot to "booked"
    await pool.query(
      `UPDATE schedules_table 
       SET slot_status = 'booked'
       WHERE schedule_id = $1`,
      [slotCheck.rows[0].schedule_id]
    );

    res.status(201).json({
      message: "Appointment booked successfully",
      appointment: result.rows[0],
    });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ error: "Booking failed. Please try again." });
  }
});


app.delete("/api/appointments/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get appointment details first
    const appointment = await pool.query(
      "SELECT * FROM appointments_table WHERE appointment_id = $1",
      [id]
    );

    // Free up the time slot
    await pool.query(
      `UPDATE schedules_table
       SET slot_status = 'available'
       WHERE doctor_id = $1
         AND available_date = $2
         AND start_time = $3`,
      [
        appointment.rows[0].doctor_id,
        appointment.rows[0].appointment_date,
        appointment.rows[0].appointment_time
      ]
    );

    // Delete the appointment
    await pool.query(
      "DELETE FROM appointments_table WHERE appointment_id = $1",
      [id]
    );

    res.status(200).json({ message: "Appointment canceled successfully" });
  } catch (error) {
    console.error("Error canceling appointment:", error);
    res.status(500).json({ error: "Failed to cancel appointment" });
  }
});

app.put("/api/appointments/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { newDate, newTime } = req.body; // newTime must be in "HH:MM:SS" (24-hour) format

    // Retrieve the old appointment.
    const oldAppointmentResult = await pool.query(
      "SELECT * FROM appointments_table WHERE appointment_id = $1",
      [id]
    );
    if (oldAppointmentResult.rowCount === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    const oldAppointment = oldAppointmentResult.rows[0];
    const doctorId = oldAppointment.doctor_id;
    if (!doctorId) {
      return res.status(400).json({ error: "Doctor ID not found in appointment" });
    }

    // Free up the old slot.
    await pool.query(
      `UPDATE schedules_table
       SET slot_status = 'available'
       WHERE doctor_id = $1
         AND available_date = $2
         AND start_time = $3`,
      [doctorId, oldAppointment.appointment_date, oldAppointment.appointment_time]
    );

    // Check if the new slot is available.
    const newSlotResult = await pool.query(
      `SELECT * FROM schedules_table
       WHERE doctor_id = $1
         AND available_date = $2
         AND start_time = $3`,
      [doctorId, newDate, newTime]
    );
    if (newSlotResult.rowCount === 0 || newSlotResult.rows[0].slot_status !== "available") {
      return res.status(400).json({ error: "Selected slot not available" });
    }

    // Update the appointment record.
    const updatedAppointmentResult = await pool.query(
      `UPDATE appointments_table
       SET appointment_date = $1, appointment_time = $2
       WHERE appointment_id = $3
       RETURNING *`,
      [newDate, newTime, id]
    );

    // Mark the new slot as booked.
    await pool.query(
      `UPDATE schedules_table
       SET slot_status = 'booked'
       WHERE schedule_id = $1`,
      [newSlotResult.rows[0].schedule_id]
    );

    res.json(updatedAppointmentResult.rows[0]);
  } catch (error) {
    console.error("Error updating appointment:", error);
    res.status(500).json({ error: "Failed to reschedule appointment" });
  }
});




app.get("/api/available-slotd", async (req, res) => {
  try {
    const { doctor_id, date } = req.query;

    if (!doctor_id || !date) {
      return res.status(400).json({ error: "Missing doctor_id or date" });
    }

    const result = await pool.query(
      `SELECT schedule_id, start_time, slot_status 
       FROM schedules_table 
       WHERE doctor_id = $1 AND available_date = $2`,
      [doctor_id, date]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching available slots:", error.message);
    res.status(500).json({ error: "Failed to fetch slots" });
  }
});




// Helper function to convert 12-hour time (e.g., "09:00 AM") to 24-hour time (e.g., "09:00:00")
function convertTime12to24(time12h) {
  const [time, modifier] = time12h.split(" ");
  let [hours, minutes] = time.split(":");
  if (modifier === "PM" && hours !== "12") hours = parseInt(hours, 10) + 12;
  if (modifier === "AM" && hours === "12") hours = "00";
  return `${hours.toString().padStart(2, "0")}:${minutes}:00`;
}


// Helper function: Convert 12-hour time to 24-hour time.
function convertTime12to24(time12h) {
  const [time, modifier] = time12h.split(" ");
  let [hours, minutes] = time.split(":");
  if (modifier === "PM" && hours !== "12") hours = parseInt(hours, 10) + 12;
  if (modifier === "AM" && hours === "12") hours = "00";
  return `${hours.toString().padStart(2, "0")}:${minutes}:00`;
}





// Add this backend endpoint
app.get("/api/doctor/details", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.name 
       FROM users_table u
       JOIN doctors_table d ON u.user_id = d.user_id
       WHERE d.user_id = $1`,
      [req.user.userId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching doctor details:", error);
    res.status(500).json({ error: "Error fetching doctor details" });
  }
});



// Doctor Dashboard info Retrieval
// Secure endpoint to fetch patient's phone number
// Backend endpoint for doctor appointments
app.get("/api/doctor/appointments", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.appointment_id, 
              a.doctor_id,
              u.name AS patient_name,
              u.phone_number AS patient_phone,
              a.appointment_date,
              a.appointment_time,
              a.details
       FROM appointments_table a
       JOIN users_table u ON a.patient_id = u.user_id
       WHERE a.doctor_id = (
         SELECT doctor_id FROM doctors_table WHERE user_id = $1
       )
       AND a.appointment_date >= CURRENT_DATE
       ORDER BY a.appointment_date, a.appointment_time`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ error: "Error fetching appointments" });
  }
});

app.post("/api/reviews", authenticateToken, async (req, res) => {
  try {
    const { doctorId, rating, comment } = req.body; // doctorId is actually user_id, not doctor_id
    const patientId = req.user.userId; // JWT-authenticated user

    // Validate input
    if (!doctorId || rating === undefined) {
      return res.status(400).json({ error: "doctorId (user_id) and rating are required." });
    }

    if (typeof rating !== "number" || rating < 0 || rating > 5) {
      return res.status(400).json({ error: "Rating must be a number between 0 and 5." });
    }

    // 🔹 Convert user_id (doctorId) to doctor_id
    const doctorResult = await pool.query(
      "SELECT doctor_id FROM doctors_table WHERE user_id = $1",
      [doctorId]  // Here, doctorId is actually user_id
    );

    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    const actualDoctorId = doctorResult.rows[0].doctor_id; // The real doctor_id

    // Insert new review
    await pool.query(
      `INSERT INTO reviews_table (doctor_id, patient_id, rating, comment)
       VALUES ($1, $2, $3, $4)`,
      [actualDoctorId, patientId, rating, comment || ""]
    );

    // Recalculate and update the average rating
    const avgResult = await pool.query(
      `SELECT AVG(rating) as avg_rating FROM reviews_table WHERE doctor_id = $1`,
      [actualDoctorId]
    );
    
    const avgRating = parseFloat(avgResult.rows[0].avg_rating) || 0;

    await pool.query(
      `UPDATE doctors_table SET rating = $1 WHERE doctor_id = $2`,
      [avgRating, actualDoctorId]
    );

    res.status(201).json({ message: "Review posted successfully", newRating: avgRating });
  } catch (error) {
    console.error("Error posting review:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});






// Populate schedules for next 7 days for every doctor
async function populateSchedulesForNext7Days() {
  try {
    const timeSlots = [
      "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
      "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
    ];

    // Helper function to add one hour to a given time string (in HH:MM:SS)
    const addOneHour = (timeStr) => {
      let [hours, minutes, seconds] = timeStr.split(":").map(Number);
      hours = (hours + 1) % 24;
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    // Query all doctors from doctors_table
    const doctorsResult = await pool.query("SELECT doctor_id FROM doctors_table");
    const doctors = doctorsResult.rows;

    for (const doctor of doctors) {
      const doctorId = doctor.doctor_id;
      // For each of the next 7 days (including today)
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dateObj = new Date();
        dateObj.setDate(dateObj.getDate() + dayOffset);
        const year = dateObj.getFullYear();
        const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
        const day = dateObj.getDate().toString().padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;
        // For each defined time slot
        for (const slot of timeSlots) {
          const startTime = convertTime12to24(slot); // e.g., "09:00 AM" -> "09:00:00"
          const endTime = addOneHour(startTime);      // e.g., "09:00:00" -> "10:00:00"
          // Check if a schedule row already exists for this doctor, date, and start time
          const scheduleCheck = await pool.query(
            `SELECT * FROM schedules_table 
             WHERE doctor_id = $1 AND available_date = $2 AND start_time = $3`,
            [doctorId, dateStr, startTime]
          );
          // If no row exists, insert a new schedule row with status "available"
          if (scheduleCheck.rowCount === 0) {
            await pool.query(
              `INSERT INTO schedules_table (doctor_id, available_date, start_time, end_time, slot_status)
               VALUES ($1, $2, $3, $4, 'available')`,
              [doctorId, dateStr, startTime, endTime]
            );
            console.log(`Inserted schedule for doctor ${doctorId} on ${dateStr} at ${startTime}`);
          }
        }
      }
    }
    console.log("Schedules populated for next 7 days.");
  } catch (error) {
    console.error("Error populating schedules:", error);
  }
}

// Call once at server startup
populateSchedulesForNext7Days();

// Then schedule the function to run once every 24 hours (86400000 ms)
setInterval(populateSchedulesForNext7Days, 86400000);





// Secure route example
app.get("/api/home", authenticateToken, (req, res) => {
  res.json({ message: `Welcome, user ${req.user.userId}` });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
