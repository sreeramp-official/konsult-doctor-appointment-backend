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


// otp area
// Configure email transporter (use your email service)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS || "Not set"
    }
});

// Store OTPs temporarily (use Redis in production)
const otpStore = new Map();

// Generate OTP
const generateOTP = () => crypto.randomInt(100000, 999999);
// otp area closed

// Secret key for JWT
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


// Send OTP Endpoint
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

// Verify OTP and Update Password
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



// Add this after the existing /api/register endpoint
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
// Register API
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
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    console.log("Login attempt for:", email); // Debug log

    try {
        const result = await pool.query("SELECT * FROM users_table WHERE email = $1", [email]);

        if (result.rows.length === 0) {
            console.log("No user found with email:", email);
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = result.rows[0];
        console.log("User found. Comparing password...");

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        console.log("Password match result:", passwordMatch);

        if (passwordMatch) {
            const token = jwt.sign(
                {
                    userId: user.user_id,
                    role: user.role,
                    email: user.email
                },
                SECRET_KEY,
                { expiresIn: "1h" }
            );

            console.log("Generated token for user:", user.email);
            res.status(200).json({ token });
        } else {
            console.log("Password mismatch for user:", user.email);
            res.status(401).json({ error: "Invalid email or password" });
        }
    } catch (err) {
        console.error("Login error:", err.stack); // Detailed error log
        res.status(500).json({ error: "Error logging in" });
    }
});

// Middleware to protect routes
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