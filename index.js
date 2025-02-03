const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pool = require("./db/db");
const appointmentRoutes = require("./routes/appointmentRoutes");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const app = express();
const PORT = 5000;

// Secret key for JWT
const SECRET_KEY = process.env.SECRET_KEY || "secret123";

// Middleware
app.use(
    cors({
        origin: ["http://localhost:3000", "http://localhost:5173"],
        credentials: true,
    })
);
app.use(helmet());
app.use(express.json());

// Email transporter (with proper logging for missing env variables)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// OTP storage (use Redis in production)
const otpStore = new Map();
const generateOTP = () => crypto.randomInt(100000, 999999);

// Root route
app.get("/", (req, res) => {
    res.send("Welcome to the Doctor Availability and Appointment Booking API!");
});

// Health route (Database connection check)
app.get("/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW() AS server_time");
        res.status(200).json({
            message: "Database connected successfully",
            server_time: result.rows[0].server_time,
        });
    } catch (error) {
        console.error("Database connection error:", error.stack);
        res.status(500).json({
            message: "Database connection failed",
            error: error.message,
        });
    }
});

// Register API
app.post("/api/register", async (req, res) => {
    const { name, email, phone_number, password, role } = req.body;

    // Validate input
    if (!name || !email || !phone_number || !password || !role) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        // Check for duplicate email or phone_number
        const existingUser = await pool.query(
            "SELECT * FROM users_table WHERE email = $1 OR phone_number = $2",
            [email, phone_number]
        );
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: "Email or phone number already exists" });
        }

        // Hash password and insert user
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO users_table (name, email, phone_number, password_hash, role) 
             VALUES ($1, $2, $3, $4, $5) RETURNING user_id`,
            [name, email, phone_number, hashedPassword, role]
        );

        res.status(201).json({
            message: "User registered successfully",
            userId: result.rows[0].user_id,
        });
    } catch (err) {
        console.error("Registration error:", err.stack);
        res.status(500).json({ error: "Error registering user" });
    }
});

// Register Doctor API
// Add the following code to handle doctor registration
app.post("/api/register/doctor", async (req, res) => {
    const { userId, specialization, contactNumber, clinicAddress } = req.body;

    // Validate required fields
    if (!userId || !specialization || !contactNumber || !clinicAddress) {
        return res.status(400).json({ error: "All fields are required for doctor registration." });
    }

    try {
        // Insert doctor into the doctors_table
        const result = await pool.query(
            `INSERT INTO doctors_table (user_id, specialization, contact_number, clinic_address)
             VALUES ($1, $2, $3, $4) RETURNING doctor_id`,
            [userId, specialization, contactNumber, clinicAddress]
        );

        res.status(201).json({
            message: "Doctor registered successfully",
            doctorId: result.rows[0].doctor_id,
        });
    } catch (err) {
        console.error("Doctor registration error:", err.stack);
        res.status(500).json({ error: "Error registering doctor" });
    }
});

// Send OTP
app.post("/api/send-otp", async (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        const user = await pool.query("SELECT * FROM users_table WHERE email = $1", [email]);
        if (!user.rows.length) return res.status(404).json({ error: "Email not registered" });

        const otp = generateOTP();
        otpStore.set(email, { otp, expires: Date.now() + 300000 }); // 5 minutes expiry

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset OTP",
            text: `Your OTP for password reset is: ${otp}`,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "OTP sent successfully" });
    } catch (err) {
        console.error("OTP send error:", err.stack);
        res.status(500).json({ error: "Failed to send OTP" });
    }
});

// Reset Password
app.post("/api/reset-password", async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: "All fields are required" });
    }

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
        await pool.query("UPDATE users_table SET password_hash = $1 WHERE email = $2", [
            hashedPassword,
            email,
        ]);

        otpStore.delete(email);
        res.status(200).json({ message: "Password updated successfully" });
    } catch (err) {
        console.error("Password reset error:", err.stack);
        res.status(500).json({ error: "Password reset failed" });
    }
});

// Login API
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const result = await pool.query("SELECT * FROM users_table WHERE email = $1", [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (passwordMatch) {
            const token = jwt.sign(
                {
                    userId: user.user_id,
                    role: user.role,
                    email: user.email,
                },
                SECRET_KEY,
                { expiresIn: "1h" }
            );

            res.status(200).json({ token });
        } else {
            res.status(401).json({ error: "Invalid email or password" });
        }
    } catch (err) {
        console.error("Login error:", err.stack);
        res.status(500).json({ error: "Error logging in" });
    }
});

// Protect Routes Middleware
const authenticateToken = (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid token" });
        req.user = user;
        next();
    });
};

// Secure route example
app.get("/api/home", authenticateToken, (req, res) => {
    res.json({ message: `Welcome, user ${req.user.userId}` });
});

// Appointment routes
app.use("/api/appointments", appointmentRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
