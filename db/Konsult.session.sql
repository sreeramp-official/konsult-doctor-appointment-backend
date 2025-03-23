-- Truncate tables and reset identity counters.
TRUNCATE TABLE reviews_table,
appointments_table,
schedules_table,
doctors_table,
users_table RESTART IDENTITY CASCADE;
----------------------------------
-- First Batch: Insert 24 doctors (3 per specialty for 8 specialties)
----------------------------------
-- Insert dummy doctor users into users_table.
INSERT INTO users_table (name, email, phone_number, password_hash, role)
VALUES -- Cardiology
    (
        'Dr. John Cardio1',
        'john.cardio1@example.com',
        '1111111111',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Jane Cardio2',
        'jane.cardio2@example.com',
        '1111111112',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Jim Cardio3',
        'jim.cardio3@example.com',
        '1111111113',
        'dummyhash',
        'doctor'
    ),
    -- Dermatology
    (
        'Dr. Alice Derm1',
        'alice.derm1@example.com',
        '2222222221',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Bob Derm2',
        'bob.derm2@example.com',
        '2222222222',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Carol Derm3',
        'carol.derm3@example.com',
        '2222222223',
        'dummyhash',
        'doctor'
    ),
    -- Pediatrics
    (
        'Dr. David Pedia1',
        'david.pedia1@example.com',
        '3333333331',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Eva Pedia2',
        'eva.pedia2@example.com',
        '3333333332',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Frank Pedia3',
        'frank.pedia3@example.com',
        '3333333333',
        'dummyhash',
        'doctor'
    ),
    -- Neurology
    (
        'Dr. Grace Neuro1',
        'grace.neuro1@example.com',
        '4444444441',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Henry Neuro2',
        'henry.neuro2@example.com',
        '4444444442',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Irene Neuro3',
        'irene.neuro3@example.com',
        '4444444443',
        'dummyhash',
        'doctor'
    ),
    -- General Physician
    (
        'Dr. Jack General1',
        'jack.general1@example.com',
        '5555555551',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Karen General2',
        'karen.general2@example.com',
        '5555555552',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Leo General3',
        'leo.general3@example.com',
        '5555555553',
        'dummyhash',
        'doctor'
    ),
    -- Orthopedics
    (
        'Dr. Monica Ortho1',
        'monica.ortho1@example.com',
        '6666666661',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Nathan Ortho2',
        'nathan.ortho2@example.com',
        '6666666662',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Olivia Ortho3',
        'olivia.ortho3@example.com',
        '6666666663',
        'dummyhash',
        'doctor'
    ),
    -- Psychiatry
    (
        'Dr. Paul Psych1',
        'paul.psych1@example.com',
        '7777777771',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Quinn Psych2',
        'quinn.psych2@example.com',
        '7777777772',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Rachel Psych3',
        'rachel.psych3@example.com',
        '7777777773',
        'dummyhash',
        'doctor'
    ),
    -- Radiology
    (
        'Dr. Steve Radio1',
        'steve.radio1@example.com',
        '8888888881',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Tina Radio2',
        'tina.radio2@example.com',
        '8888888882',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Uma Radio3',
        'uma.radio3@example.com',
        '8888888883',
        'dummyhash',
        'doctor'
    );
-- Insert corresponding details into doctors_table.
INSERT INTO doctors_table (
        user_id,
        specialization,
        contact_number,
        clinic_address
    )
VALUES -- Cardiology
    (
        1,
        'Cardiology',
        '1111111111',
        '123 Heart Street, City A'
    ),
    (
        2,
        'Cardiology',
        '1111111112',
        '124 Heart Street, City A'
    ),
    (
        3,
        'Cardiology',
        '1111111113',
        '125 Heart Street, City A'
    ),
    -- Dermatology
    (
        4,
        'Dermatology',
        '2222222221',
        '200 Skin Ave, City B'
    ),
    (
        5,
        'Dermatology',
        '2222222222',
        '201 Skin Ave, City B'
    ),
    (
        6,
        'Dermatology',
        '2222222223',
        '202 Skin Ave, City B'
    ),
    -- Pediatrics
    (
        7,
        'Pediatrics',
        '3333333331',
        '300 Child Blvd, City C'
    ),
    (
        8,
        'Pediatrics',
        '3333333332',
        '301 Child Blvd, City C'
    ),
    (
        9,
        'Pediatrics',
        '3333333333',
        '302 Child Blvd, City C'
    ),
    -- Neurology
    (
        10,
        'Neurology',
        '4444444441',
        '400 Brain Road, City D'
    ),
    (
        11,
        'Neurology',
        '4444444442',
        '401 Brain Road, City D'
    ),
    (
        12,
        'Neurology',
        '4444444443',
        '402 Brain Road, City D'
    ),
    -- General Physician
    (
        13,
        'General Physician',
        '5555555551',
        '500 General St, City E'
    ),
    (
        14,
        'General Physician',
        '5555555552',
        '501 General St, City E'
    ),
    (
        15,
        'General Physician',
        '5555555553',
        '502 General St, City E'
    ),
    -- Orthopedics
    (
        16,
        'Orthopedics',
        '6666666661',
        '600 Bone Rd, City F'
    ),
    (
        17,
        'Orthopedics',
        '6666666662',
        '601 Bone Rd, City F'
    ),
    (
        18,
        'Orthopedics',
        '6666666663',
        '602 Bone Rd, City F'
    ),
    -- Psychiatry
    (
        19,
        'Psychiatry',
        '7777777771',
        '700 Mind Ave, City G'
    ),
    (
        20,
        'Psychiatry',
        '7777777772',
        '701 Mind Ave, City G'
    ),
    (
        21,
        'Psychiatry',
        '7777777773',
        '702 Mind Ave, City G'
    ),
    -- Radiology
    (
        22,
        'Radiology',
        '8888888881',
        '800 Imaging Blvd, City H'
    ),
    (
        23,
        'Radiology',
        '8888888882',
        '801 Imaging Blvd, City H'
    ),
    (
        24,
        'Radiology',
        '8888888883',
        '802 Imaging Blvd, City H'
    );
----------------------------------
-- Second Batch: Insert additional doctors so that each specialty has more than 3 entries
----------------------------------
-- Insert additional doctor users.
INSERT INTO users_table (name, email, phone_number, password_hash, role)
VALUES -- Cardiology additional
    (
        'Dr. Ethan Cardio4',
        'ethan.cardio4@example.com',
        '1111111120',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Fiona Cardio5',
        'fiona.cardio5@example.com',
        '1111111121',
        'dummyhash',
        'doctor'
    ),
    -- Dermatology additional
    (
        'Dr. George Derm4',
        'george.derm4@example.com',
        '2222222230',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Helen Derm5',
        'helen.derm5@example.com',
        '2222222231',
        'dummyhash',
        'doctor'
    ),
    -- Pediatrics additional
    (
        'Dr. Ian Pedia4',
        'ian.pedia4@example.com',
        '3333333340',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Julia Pedia5',
        'julia.pedia5@example.com',
        '3333333341',
        'dummyhash',
        'doctor'
    ),
    -- Neurology additional
    (
        'Dr. Kevin Neuro4',
        'kevin.neuro4@example.com',
        '4444444450',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Laura Neuro5',
        'laura.neuro5@example.com',
        '4444444451',
        'dummyhash',
        'doctor'
    ),
    -- General Physician additional
    (
        'Dr. Martin General4',
        'martin.general4@example.com',
        '5555555560',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Nora General5',
        'nora.general5@example.com',
        '5555555561',
        'dummyhash',
        'doctor'
    ),
    -- Orthopedics additional
    (
        'Dr. Oliver Ortho4',
        'oliver.ortho4@example.com',
        '6666666670',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Paula Ortho5',
        'paula.ortho5@example.com',
        '6666666671',
        'dummyhash',
        'doctor'
    ),
    -- Psychiatry additional
    (
        'Dr. Quentin Psych4',
        'quentin.psych4@example.com',
        '7777777780',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Rebecca Psych5',
        'rebecca.psych5@example.com',
        '7777777781',
        'dummyhash',
        'doctor'
    ),
    -- Radiology additional
    (
        'Dr. Samuel Radio4',
        'samuel.radio4@example.com',
        '8888888890',
        'dummyhash',
        'doctor'
    ),
    (
        'Dr. Tina Radio5',
        'tina.radio5@example.com',
        '8888888891',
        'dummyhash',
        'doctor'
    );
-- Insert corresponding details for additional doctors.
-- New user_ids are assumed to start at 25.
INSERT INTO doctors_table (
        user_id,
        specialization,
        contact_number,
        clinic_address
    )
VALUES -- Cardiology additional
    (
        25,
        'Cardiology',
        '1111111120',
        '126 Heart Street, City A'
    ),
    (
        26,
        'Cardiology',
        '1111111121',
        '127 Heart Street, City A'
    ),
    -- Dermatology additional
    (
        27,
        'Dermatology',
        '2222222230',
        '203 Skin Ave, City B'
    ),
    (
        28,
        'Dermatology',
        '2222222231',
        '204 Skin Ave, City B'
    ),
    -- Pediatrics additional
    (
        29,
        'Pediatrics',
        '3333333340',
        '303 Child Blvd, City C'
    ),
    (
        30,
        'Pediatrics',
        '3333333341',
        '304 Child Blvd, City C'
    ),
    -- Neurology additional
    (
        31,
        'Neurology',
        '4444444450',
        '403 Brain Road, City D'
    ),
    (
        32,
        'Neurology',
        '4444444451',
        '404 Brain Road, City D'
    ),
    -- General Physician additional
    (
        33,
        'General Physician',
        '5555555560',
        '503 General St, City E'
    ),
    (
        34,
        'General Physician',
        '5555555561',
        '504 General St, City E'
    ),
    -- Orthopedics additional
    (
        35,
        'Orthopedics',
        '6666666670',
        '603 Bone Rd, City F'
    ),
    (
        36,
        'Orthopedics',
        '6666666671',
        '604 Bone Rd, City F'
    ),
    -- Psychiatry additional
    (
        37,
        'Psychiatry',
        '7777777780',
        '703 Mind Ave, City G'
    ),
    (
        38,
        'Psychiatry',
        '7777777781',
        '704 Mind Ave, City G'
    ),
    -- Radiology additional
    (
        39,
        'Radiology',
        '8888888890',
        '803 Imaging Blvd, City H'
    ),
    (
        40,
        'Radiology',
        '8888888891',
        '804 Imaging Blvd, City H'
    );
UPDATE doctors_table
SET rating = round((random() * 5)::numeric, 2);