# Konsult Backend

This is the backend server for **Konsult**, a platform that connects users with experts for consultations.

## 🌐 Live Frontend

Check out the frontend here: [konsult-68bf.onrender.com](https://konsult-68bf.onrender.com/)

## 🛠️ Tech Stack

- **Node.js**
- **Express**
- **PostgreSQL**
- **JWT Authentication**
- **Dotenv**

## 📦 Installation

1. Clone the repository:
   ```bash
   git clone git@github.com:sreeramp-official/konsult-doctor-appointment-backend.git
   cd konsult-doctor-appointment-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in a `.env` file:
   ```env
    PORT=3001
    DB_HOST=your_db_host
    DB_PORT=your_db_port
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_NAME=your_db_name
    EMAIL_USER=your_email
    EMAIL_PASS="your_email_password"
    SECRET_KEY=your_secret_key
   ```

4. Start the server:
   ```bash
   npm start
   ```
## 🔐 Features

- Patient & Doctor registration/login
- JWT-based authentication
- Role-based access control
