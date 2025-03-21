DROP TABLE IF EXISTS appointments_table,
schedules_table,
doctors_table,
users_table CASCADE;
-- Table: public.users_table
CREATE TABLE IF NOT EXISTS public.users_table (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('doctor', 'patient')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.users_table OWNER TO postgres;
-- Table: public.doctors_table
CREATE TABLE IF NOT EXISTS public.doctors_table (
    doctor_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES public.users_table(user_id) ON DELETE CASCADE,
    specialization VARCHAR(100) NOT NULL,
    contact_number VARCHAR(15) NOT NULL,
    clinic_address TEXT NOT NULL,
    rating NUMERIC(2, 1) DEFAULT 0
);
ALTER TABLE public.doctors_table OWNER TO postgres;
-- Table: public.schedules_table
CREATE TABLE IF NOT EXISTS public.schedules_table (
    schedule_id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES public.doctors_table(doctor_id) ON DELETE CASCADE,
    available_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_status VARCHAR(50) DEFAULT 'available' CHECK (slot_status IN ('available', 'booked'))
);
ALTER TABLE public.schedules_table OWNER TO postgres;
-- Table: public.appointments_table
CREATE TABLE IF NOT EXISTS public.appointments_table (
    appointment_id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES public.doctors_table(doctor_id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES public.users_table(user_id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(50) DEFAULT 'booked' CHECK (status IN ('booked', 'completed', 'canceled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    CONSTRAINT unique_slot UNIQUE (doctor_id, appointment_date, appointment_time)
);
ALTER TABLE public.appointments_table OWNER TO postgres;
-- Table: public.reviews_table
CREATE TABLE IF NOT EXISTS public.reviews_table (
    review_id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES public.doctors_table(doctor_id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES public.users_table(user_id) ON DELETE CASCADE,
    rating NUMERIC(2, 1) CHECK (
        rating >= 0
        AND rating <= 5
    ),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.reviews_table OWNER TO postgres;
-- Insert dummy data into users_table
INSERT INTO public.users_table (name, email, phone_number, password_hash, role)
VALUES (
        'Dr. John Doe',
        'johndoe@example.com',
        '1234567890',
        'hashedpassword1',
        'doctor'
    ),
    (
        'Jane Smith',
        'janesmith@example.com',
        '0987654321',
        'hashedpassword2',
        'patient'
    );
-- Insert dummy data into doctors_table
INSERT INTO public.doctors_table (
        user_id,
        specialization,
        contact_number,
        clinic_address,
        rating
    )
VALUES (
        1,
        'Cardiology',
        '1234567890',
        '123 Heart Street',
        4.5
    );
-- Insert dummy data into schedules_table
INSERT INTO public.schedules_table (
        doctor_id,
        available_date,
        start_time,
        end_time,
        slot_status
    )
VALUES (
        1,
        '2025-03-18',
        '09:00:00',
        '12:00:00',
        'available'
    );
-- Insert dummy data into appointments_table
INSERT INTO public.appointments_table (
        doctor_id,
        patient_id,
        appointment_date,
        appointment_time,
        status,
        details
    )
VALUES (
        1,
        2,
        '2025-03-18',
        '10:00:00',
        'booked',
        'Routine checkup'
    );
-- Insert dummy data into reviews_table
INSERT INTO public.reviews_table (doctor_id, patient_id, rating, comment)
VALUES (1, 2, 4.5, 'Excellent doctor!');