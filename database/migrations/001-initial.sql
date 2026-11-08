CREATE TABLE IF NOT EXISTS owners (
 id VARCHAR(36) PRIMARY KEY,
 name VARCHAR(120) NOT NULL,
 email VARCHAR(254) NOT NULL,
 phone VARCHAR(30) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS pets (
 id VARCHAR(36) PRIMARY KEY,
 owner_id VARCHAR(36) NOT NULL,
 name VARCHAR(120) NOT NULL,
 species VARCHAR(60) NOT NULL,
 breed VARCHAR(100) NULL,
 birth_date DATE NULL,
 FOREIGN KEY (owner_id) REFERENCES owners(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS veterinarians (
 id VARCHAR(36) PRIMARY KEY,
 name VARCHAR(120) NOT NULL,
 active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS medical_records (
 id VARCHAR(36) PRIMARY KEY,
 pet_id VARCHAR(36) NOT NULL,
 veterinarian_id VARCHAR(36) NOT NULL,
 recorded_at DATETIME(3) NOT NULL,
 clinical_note TEXT NOT NULL,
 FOREIGN KEY (pet_id) REFERENCES pets(id),
 FOREIGN KEY (veterinarian_id) REFERENCES veterinarians(id),
 INDEX idx_history_pet_date (pet_id, recorded_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS appointments (
 id VARCHAR(36) PRIMARY KEY,
 pet_id VARCHAR(36) NOT NULL,
 veterinarian_id VARCHAR(36) NOT NULL,
 starts_at DATETIME(3) NOT NULL,
 ends_at DATETIME(3) NOT NULL,
 reason VARCHAR(500) NOT NULL,
 FOREIGN KEY (pet_id) REFERENCES pets(id),
 FOREIGN KEY (veterinarian_id) REFERENCES veterinarians(id),
 CONSTRAINT chk_appointment_interval CHECK (ends_at > starts_at),
 INDEX idx_appointments_vet_start (veterinarian_id, starts_at),
 INDEX idx_appointments_start (starts_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS notification_logs (
 id VARCHAR(36) PRIMARY KEY,
 appointment_id VARCHAR(36) NOT NULL,
 type VARCHAR(30) NOT NULL,
 recipient VARCHAR(254) NOT NULL,
 simulated_at DATETIME(3) NOT NULL,
 message TEXT NOT NULL,
 FOREIGN KEY (appointment_id) REFERENCES appointments(id),
 UNIQUE KEY uq_notification_appointment_type (appointment_id, type)
) ENGINE=InnoDB;
