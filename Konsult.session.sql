-- Create the users table
CREATE TABLE users_table (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('doctor', 'patient')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Create the doctors table
CREATE TABLE doctors_table (
    doctor_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    contact_number VARCHAR(15) NOT NULL,
    clinic_address TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users_table (user_id) ON DELETE CASCADE
);
-- Create the schedules table
CREATE TABLE schedules_table (
    schedule_id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL,
    available_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    FOREIGN KEY (doctor_id) REFERENCES doctors_table (doctor_id) ON DELETE CASCADE,
    UNIQUE (doctor_id, available_date, start_time, end_time)
);
-- Create the appointments table
CREATE TABLE appointments_table (
    appointment_id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL,
    patient_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(50) CHECK (status IN ('booked', 'completed', 'canceled')) DEFAULT 'booked',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors_table (doctor_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES users_table (user_id) ON DELETE CASCADE
);
-- Insert sample users
INSERT INTO users_table (name, email, phone_number, password_hash, role)
VALUES (
        'John Doe',
        'john@example.com',
        '1234567890',
        'hashed_password1',
        'doctor'
    ),
    (
        'Jane Smith',
        'jane@example.com',
        '1234567891',
        'hashed_password2',
        'doctor'
    ),
    (
        'Emily Davis',
        'emily@example.com',
        '1234567892',
        'hashed_password3',
        'doctor'
    ),
    (
        'Michael Brown',
        'michael@example.com',
        '1234567893',
        'hashed_password4',
        'doctor'
    ),
    (
        'Sarah Wilson',
        'sarah@example.com',
        '1234567894',
        'hashed_password5',
        'doctor'
    ),
    (
        'Alice Johnson',
        'alice@example.com',
        '1234567895',
        'hashed_password6',
        'patient'
    ),
    (
        'Robert Taylor',
        'robert@example.com',
        '1234567896',
        'hashed_password7',
        'patient'
    );
-- Insert sample doctors
INSERT INTO doctors_table (
        user_id,
        specialization,
        contact_number,
        clinic_address
    )
VALUES (
        1,
        'Cardiologist',
        '1234567890',
        '123 Main Street, City A'
    ),
    (
        2,
        'Dermatologist',
        '1234567891',
        '456 Maple Avenue, City B'
    ),
    (
        3,
        'Pediatrician',
        '1234567892',
        '789 Oak Road, City C'
    ),
    (
        4,
        'Orthopedic Surgeon',
        '1234567893',
        '101 Pine Lane, City D'
    ),
    (
        5,
        'Neurologist',
        '1234567894',
        '202 Birch Street, City E'
    );
-- Insert sample schedules for doctors
INSERT INTO schedules_table (doctor_id, available_date, start_time, end_time)
VALUES (1, '2025-01-25', '09:00', '12:00'),
    (2, '2025-01-25', '10:00', '13:00'),
    (3, '2025-01-26', '11:00', '14:00'),
    (4, '2025-01-27', '08:00', '11:00'),
    (5, '2025-01-28', '13:00', '16:00');
-- Insert sample appointments
INSERT INTO appointments_table (
        doctor_id,
        patient_id,
        appointment_date,
        appointment_time
    )
VALUES (1, 6, '2025-01-26', '10:00'),
    (2, 7, '2025-01-26', '11:00');
-- Query appointments for a specific doctor
SELECT a.appointment_id,
    u.name AS patient_name,
    a.appointment_date,
    a.appointment_time,
    a.status
FROM appointments_table a
    JOIN users_table u ON a.patient_id = u.user_id
WHERE a.doctor_id = 1;
-- Query schedules for a specific doctor on a specific date
SELECT *
FROM schedules_table
WHERE doctor_id = 1
    AND available_date = '2025-01-25';
-- Show the schema of users_table
SELECT column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users_table';
-- Show the schema of doctors_table
SELECT column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'doctors_table';
-- Show the schema of schedules_table
SELECT column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'schedules_table';
-- Show the schema of appointments_table
SELECT column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'appointments_table';