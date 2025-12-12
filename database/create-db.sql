CREATE DATABASE IF NOT EXISTS ReadEasyConnect;

USE ReadEasyConnect;

DROP TABLE IF EXISTS `audit`;
DROP TABLE IF EXISTS `coaches`;
DROP TABLE IF EXISTS `coordinators`;
DROP TABLE IF EXISTS `lessons`;
DROP TABLE IF EXISTS `loans`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `login_attempts`;
DROP TABLE IF EXISTS `managers`;
DROP TABLE IF EXISTS `password_reset`;
DROP TABLE IF EXISTS `readers`;
DROP TABLE IF EXISTS `areas`;
DROP TABLE IF EXISTS `venues`;
DROP TABLE IF EXISTS `affiliates`;
DROP TABLE IF EXISTS `regions`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `regions` (
	`region_id` INT AUTO_INCREMENT PRIMARY KEY,
	`name` VARCHAR(255) UNIQUE, 
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
	`disabled` BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE `affiliates` (
	`affiliate_id` INT AUTO_INCREMENT PRIMARY KEY,
	`name` VARCHAR(255) UNIQUE,	
	`region_id` INT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
	`disabled` BOOLEAN NOT NULL DEFAULT FALSE,
	
	FOREIGN KEY (`region_id`) REFERENCES `regions`(`region_id`),

	INDEX `idx_affiliates_region_id` (`region_id`)
);

CREATE TABLE `areas` (
	`area_id` INT AUTO_INCREMENT PRIMARY KEY,
	`name` VARCHAR(255) NOT NULL,	
	`affiliate_id` INT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
	`disabled` BOOLEAN NOT NULL DEFAULT FALSE,
	
	FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`affiliate_id`),

	UNIQUE KEY `unique_area_affiliate` (`name`, `affiliate_id`),

	INDEX `idx_areas_affiliate_id` (`affiliate_id`)
);

CREATE TABLE `venues` (
	`venue_id` INT AUTO_INCREMENT PRIMARY KEY,
	`name` VARCHAR(255) NOT NULL,
	`affiliate_id` INT NOT NULL,
	-- personal data (encrypt)
	`contact_name` VARCHAR(255),
	`contact_email` VARCHAR(255),
	`contact_telephone` VARCHAR(128),

	-- non-personal data
	`address` VARCHAR(512),
	`notes` VARCHAR(1024),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
	`disabled` BOOLEAN NOT NULL DEFAULT FALSE,
	
	FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`affiliate_id`),

	UNIQUE KEY `unique_venue_affiliate` (`name`, `affiliate_id`),

	INDEX `idx_venues_affiliate_id` (`affiliate_id`)
);

CREATE TABLE `users` (
	`user_id` INT AUTO_INCREMENT PRIMARY KEY,
	`first_name` VARCHAR(128) NOT NULL,
	`last_name` VARCHAR(128) NOT NULL,
	`email` VARCHAR(255) NOT NULL UNIQUE,
	`password` VARCHAR(255) NOT NULL,                	
	`password_reset` BOOLEAN NOT NULL DEFAULT TRUE,
	`disabled` BOOLEAN NOT NULL DEFAULT FALSE,
	`role` ENUM('admin', 'director', 'manager', 'coordinator', 'coach') NOT NULL,
	`status` ENUM('active', 'onhold', 'leaver') NOT NULL DEFAULT 'onhold',
	`last_login` DATETIME,
	`last_logout` DATETIME,
	`jwt_iat` DATETIME,
	`mfa_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
	`mfa_secret` VARCHAR(128),
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

	INDEX `idx_users_role` (`role`)
);

CREATE TABLE `coaches` (
	`coach_id` INT PRIMARY KEY,
	`affiliate_id` INT NOT NULL,
	`coordinator_id` INT,
	`area_id` INT,
	`status` ENUM('unchecked', 'untrained', 'trained', 'paired') 
				NOT NULL DEFAULT 'unchecked',
	-- personal data (encrypt)
	`address` VARCHAR(512),
	`telephone` VARCHAR(128),
	`nok_name` VARCHAR(255),
	`nok_telephone` VARCHAR(128),
	`nok_relationship` VARCHAR(255),
	
	-- non-personal data
	`email_consent` BOOLEAN NOT NULL DEFAULT FALSE,
	`whatsapp_consent` BOOLEAN NOT NULL DEFAULT FALSE,
	`dbs_completed` BOOLEAN NOT NULL DEFAULT FALSE,
	`ref_completed` BOOLEAN NOT NULL DEFAULT FALSE,
	`commitment_completed` BOOLEAN NOT NULL DEFAULT FALSE,
	`training_booked` BOOLEAN NOT NULL DEFAULT FALSE,
	`edib_train_completed` BOOLEAN NOT NULL DEFAULT FALSE,
	`consol_train_completed` BOOLEAN NOT NULL DEFAULT FALSE,
	`availability` VARCHAR(1024),
	`preferences` VARCHAR(1024),
	`notes` VARCHAR(1024),
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
	
	FOREIGN KEY (`coach_id`) REFERENCES `users`(`user_id`),
	FOREIGN KEY (`coordinator_id`) REFERENCES `users`(`user_id`),
	FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`affiliate_id`),
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`area_id`),

	INDEX `idx_coaches_affiliate_id` (`affiliate_id`),
	INDEX `idx_coaches_area_id` (`area_id`),
	INDEX `idx_coaches_coordinator_id` (`coordinator_id`)
);

CREATE TABLE `coordinators` (
	`coordinator_id` INT PRIMARY KEY,
	`affiliate_id` INT NOT NULL,

	FOREIGN KEY (`coordinator_id`) REFERENCES `users`(`user_id`),
	FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`affiliate_id`),

	INDEX `idx_coordinators_affiliate_id` (`affiliate_id`)
);

CREATE TABLE `readers` (
	`reader_id` INT AUTO_INCREMENT PRIMARY KEY,
	`name` VARCHAR(255) NOT NULL,	-- label - not real name
	`affiliate_id` INT NOT NULL,
	`area_id` INT,
	`coach_id` INT,
	`referrer_name` VARCHAR(255),
	`referrer_org` VARCHAR(255),
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
	`level` ENUM('TP1', 'TP2', 'TP3', 'TP4', 'TP5') NOT NULL DEFAULT 'TP1',
	`status` ENUM('NYS', 'S', 'P', 'DO', 'G', 'C') NOT NULL DEFAULT 'NYS',
	`availability` VARCHAR(1024),
	`notes` VARCHAR(1024),
	`enrolment_at` DATETIME,
	`coaching_start_at` DATETIME,
	`graduation_at` DATETIME,
	`TP1_start_at` DATETIME,
	`TP2_start_at` DATETIME,
	`TP3_start_at` DATETIME,
	`TP4_start_at` DATETIME,
	`TP5_start_at` DATETIME,
	`TP1_completion_at` DATETIME,
	`TP2_completion_at` DATETIME,
	`TP3_completion_at` DATETIME,
	`TP4_completion_at` DATETIME,
	`TP5_completion_at` DATETIME,
	`ons4_1` BOOLEAN NOT NULL DEFAULT FALSE,
	`ons4_2` BOOLEAN NOT NULL DEFAULT FALSE,
	`ons4_3` BOOLEAN NOT NULL DEFAULT FALSE,
	
	FOREIGN KEY (`coach_id`) REFERENCES `users`(`user_id`),
	FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`affiliate_id`),
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`area_id`),
	
	UNIQUE KEY `unique_reader_affiliate` (`name`, `affiliate_id`)	
);

CREATE TABLE `loans` (
	`loan_id` INT AUTO_INCREMENT PRIMARY KEY,
	`reader_id` INT NOT NULL,
	`item` VARCHAR(255) NOT NULL,
	`loan_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`return_date` DATETIME,
	`status` ENUM('loaned', 'returned', 'lost') NOT NULL DEFAULT 'loaned',
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY (`reader_id`) REFERENCES `readers`(`reader_id`),

	INDEX `idx_loans_reader_id` (`reader_id`)
);

CREATE TABLE `lessons` (
	`lesson_id` INT AUTO_INCREMENT PRIMARY KEY,
	`coach_id` INT NOT NULL,
	`reader_id` INT NOT NULL,
	`date` DATETIME NOT NULL,
	`venue_id` INT NOT NULL,
	`status` ENUM('scheduled', 'attended', 'cancelled', 'paused') 
				NOT NULL DEFAULT 'scheduled',	
    `attention` BOOLEAN NOT NULL DEFAULT FALSE,
	`notes` VARCHAR(1024),
	`ics_uid` VARCHAR(255),
	`ics_sequence` INT NOT NULL DEFAULT 0,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY (`coach_id`) REFERENCES `users`(`user_id`),
	FOREIGN KEY (`reader_id`) REFERENCES `readers`(`reader_id`),
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`venue_id`),

	INDEX `idx_lessons_coach_id` (`coach_id`),
	INDEX `idx_lessons_reader_id` (`reader_id`)
);

CREATE TABLE `reviews` (
	`review_id` INT AUTO_INCREMENT PRIMARY KEY,
	`coordinator_id` INT NOT NULL,
	`coach_id` INT NOT NULL,
	`reader_id` INT NOT NULL,
	`date` DATETIME NOT NULL,
	`venue_id` INT NOT NULL,
	`status` ENUM('scheduled', 'attended', 'cancelled', 'paused') 
				NOT NULL DEFAULT 'scheduled',	
	`notes` VARCHAR(1024),
	`ics_uid` VARCHAR(255),
	`ics_sequence` INT NOT NULL DEFAULT 0,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY (`coordinator_id`) REFERENCES `users`(`user_id`),
	FOREIGN KEY (`coach_id`) REFERENCES `users`(`user_id`),
	FOREIGN KEY (`reader_id`) REFERENCES `readers`(`reader_id`),
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`venue_id`),

	INDEX `idx_lessons_coach_id` (`coach_id`),
	INDEX `idx_lessons_reader_id` (`reader_id`)
);

CREATE TABLE `login_attempts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `ip_address` VARCHAR(45) NOT NULL,
    `username` VARCHAR(255) DEFAULT NULL,
    `attempts` INT NOT NULL DEFAULT 1,
    `last_attempt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
	INDEX `idx_login_attempts_ip_address` (`ip_address`),
    INDEX `idx_login_attempts_username` (`username`)
);

CREATE TABLE `managers` (
	`manager_id` INT PRIMARY KEY,
	`affiliate_id` INT NOT NULL,

	FOREIGN KEY (`manager_id`) REFERENCES `users`(`user_id`),
	FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`affiliate_id`),

	INDEX `idx_managers_affiliate_id` (`affiliate_id`)
);

CREATE TABLE `audit` (
	`audit_id` INT AUTO_INCREMENT PRIMARY KEY,
    `affiliate_id` INT,
    `performed_by_id` INT,
    `performed_on_id` INT,
    `type` ENUM('login', 'logout', 'user_added', 'user_edited', 
				'coach_added', 'coach_edited', 'reader_added', 
				'reader_edited', 'lesson_added', 'lesson_edited', 
				'review_added',  'review_edited', 'status_change', 
				'password_reset', 'other') NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`affiliate_id`),
    FOREIGN KEY (`performed_by_id`) REFERENCES `users`(`user_id`),
    FOREIGN KEY (`performed_on_id`) REFERENCES `users`(`user_id`),

	INDEX `idx_audit_affiliate_id` (`affiliate_id`)
);

CREATE TABLE `password_reset` (
	`email` VARCHAR(255) NOT NULL,
	`token` VARCHAR(255) NOT NULL UNIQUE,   -- hash
	`expiry` DATETIME DEFAULT (CURRENT_TIMESTAMP + INTERVAL 1 HOUR)
);
