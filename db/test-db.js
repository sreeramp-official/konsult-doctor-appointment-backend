const pool = require("./db/db");

pool.query("SELECT NOW()", (err, res) => {
    if (err) {
        console.error("❌ Database connection failed:", err.message);
    } else {
        console.log("✅ Database connected successfully:", res.rows[0].now);
    }
    pool.end();
});
