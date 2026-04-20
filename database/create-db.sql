DROP DATABASE IF EXISTS `readeasyconnect`;
CREATE DATABASE `readeasyconnect`;

USE `readeasyconnect`;

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
	
	FOREIGN KEY (`region_id`) REFERENCES `regions`(`region_id`)
);

CREATE TABLE `areas` (
	`area_id` INT AUTO_INCREMENT PRIMARY KEY,
	`name` VARCHAR(255) NOT NULL,	
	`affiliate_id` INT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
	`disabled` BOOLEAN NOT NULL DEFAULT FALSE,
	`reader_area` BOOLEAN NOT NULL DEFAULT FALSE,  
	`org_area` BOOLEAN NOT NULL DEFAULT FALSE,
	
	CONSTRAINT at_least_one_true CHECK (`reader_area` OR `org_area`),
	
	FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`affiliate_id`),

	UNIQUE KEY `unique_area_affiliate` (`name`, `affiliate_id`)
);

CREATE TABLE `users` (
	`user_id` INT AUTO_INCREMENT PRIMARY KEY,
	`first_name` VARCHAR(128) NOT NULL,
	`last_name` VARCHAR(128) NOT NULL,
	`email` VARCHAR(255) NOT NULL UNIQUE,
	`password` VARCHAR(255) NOT NULL,
	`password_reset` BOOLEAN NOT NULL DEFAULT TRUE,
	`disabled` BOOLEAN NOT NULL DEFAULT FALSE,
	`role` ENUM('admin', 'director', 'manager', 'coordinator', 'coach', 'viewer') NOT NULL,
	`status` ENUM('active', 'onhold', 'leaver') NOT NULL DEFAULT 'onhold',
	`last_login` DATETIME,
	`last_logout` DATETIME,
	`jwt_iat` DATETIME,
	`mfa_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
	`mfa_secret` VARCHAR(128),
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

	INDEX `idx_users_role` (`role`)
);

CREATE TABLE `orgs` (
	`org_id`  INT PRIMARY KEY AUTO_INCREMENT,
	`name` VARCHAR(120),
	`affiliate_id` INT NOT NULL,
	`area_id` INT, 
	`area_id_normalised` INT GENERATED ALWAYS AS (IFNULL(`area_id`, -1)) STORED,
	`role_civic` BOOLEAN NOT NULL DEFAULT FALSE,     -- Civic / Elected Rep
	`role_donor` BOOLEAN NOT NULL DEFAULT FALSE,     -- Donor
	`role_network` BOOLEAN NOT NULL DEFAULT FALSE,   -- Network and Info Facilitation
	`role_referrer` BOOLEAN NOT NULL DEFAULT FALSE,  -- Referrer / Potential Referrer
	`role_supplier` BOOLEAN NOT NULL DEFAULT FALSE,  -- Supplier
	`role_supporter` BOOLEAN NOT NULL DEFAULT FALSE, -- Supporter
	`role_venue` BOOLEAN NOT NULL DEFAULT FALSE,     -- Venue      
	`role_volunteer` BOOLEAN NOT NULL DEFAULT FALSE, -- Volunteer Source
	`reader_venue` BOOLEAN NOT NULL DEFAULT FALSE,
	`general_venue` BOOLEAN NOT NULL DEFAULT FALSE,
	`address` VARCHAR(512),
	`description` VARCHAR(512),
	`url` VARCHAR(1024),
	`status`  VARCHAR(512),
	`summary`  VARCHAR(512),
	`action` BOOLEAN NOT NULL DEFAULT FALSE,
	`disabled` BOOLEAN NOT NULL DEFAULT FALSE,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
	
	CONSTRAINT `constraint_venue` CHECK (NOT `role_venue` OR (`reader_venue` OR `general_venue`)),
	
	FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`affiliate_id`),
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`area_id`),
	
	UNIQUE KEY `unique_orgs_affiliate_area` (`name`, `affiliate_id`, `area_id_normalised`)
);

CREATE TABLE `org_notes` (
	`note_id` INT AUTO_INCREMENT PRIMARY KEY,
	`about_id` INT NOT NULL,
	`by_id` INT NOT NULL,
	`note` VARCHAR(1024) NOT NULL,
	`note_at` DATETIME NOT NULL,
	`type` ENUM('civic', 'donor', 'network', 'referrer', 'supplier', 'supporter', 'venue', 'volunteer'),
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY (`about_id`) REFERENCES `orgs`(`org_id`),
	FOREIGN KEY (`by_id`) REFERENCES `users`(`user_id`)
);

CREATE TABLE `contacts` (
	`contact_id` INT AUTO_INCREMENT PRIMARY KEY,
	`org_id`  INT NOT NULL,
	`disabled` BOOLEAN NOT NULL DEFAULT FALSE,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
	`marketing_consent` BOOLEAN NOT NULL DEFAULT FALSE,
	`marketing_consent_at` DATETIME NULL,
	`marketing_consent_source` VARCHAR(255) NULL,
	-- personal data (encrypt)
	`name` VARCHAR(255) NOT NULL,
	`role` VARCHAR(255),
	`email` VARCHAR(255),
	`telephone` VARCHAR(128),
	`notes` VARCHAR(1024),

	FOREIGN KEY (`org_id`) REFERENCES `orgs`(`org_id`),

	UNIQUE KEY `unique_contacts_name` (`org_id`, `name`)
);

CREATE TABLE `referrals` (
	`referral_id` INT AUTO_INCREMENT PRIMARY KEY,
	`org_id`  INT NOT NULL,
	`contact_id` INT,
	`by_id` INT NOT NULL,
	`status` ENUM('new', 'pending', 'onhold', 'closed-successful', 'closed-withdrew', 'closed-unable') NOT NULL DEFAULT 'new',
	`referral` VARCHAR(1024) NOT NULL,
	`referral_at` DATETIME NOT NULL,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY (`org_id`) REFERENCES `orgs`(`org_id`),
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`contact_id`),
	FOREIGN KEY (`by_id`) REFERENCES `users`(`user_id`)
);

CREATE TABLE `referral_notes` (
	`note_id` INT AUTO_INCREMENT PRIMARY KEY,
	`about_id` INT NOT NULL,
	`by_id` INT NOT NULL,
	`note` VARCHAR(1024) NOT NULL,
	`note_at` DATETIME NOT NULL,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY (`about_id`) REFERENCES `referrals`(`referral_id`),
	FOREIGN KEY (`by_id`) REFERENCES `users`(`user_id`)
);

CREATE TABLE `coaches` (
	`coach_id` INT PRIMARY KEY,
	`affiliate_id` INT NOT NULL,
	`coordinator_id` INT,
	`area_id` INT,
	`status` ENUM('unchecked', 'untrained', 'trained', 'paired') NOT NULL DEFAULT 'unchecked',
	-- personal data (encrypt)
	`address` VARCHAR(512),
	`telephone` VARCHAR(128),
	`nok_name` VARCHAR(255),
	`nok_telephone` VARCHAR(128),
	`nok_relationship` VARCHAR(255),
	
	-- non-personal data
	`email_consent` BOOLEAN NOT NULL DEFAULT FALSE,
	`whatsapp_consent` BOOLEAN NOT NULL DEFAULT FALSE,
	`use_email` BOOLEAN NOT NULL DEFAULT FALSE,
	`dbs_completed` BOOLEAN NOT NULL DEFAULT FALSE,
	`ref_completed` BOOLEAN NOT NULL DEFAULT FALSE,
	`commitment_completed` BOOLEAN NOT NULL DEFAULT FALSE,
	`training` ENUM('not_booked', 'booked', 'completed') NOT NULL DEFAULT 'not_booked',
	`edib_training` ENUM('not_booked', 'booked', 'completed') NOT NULL DEFAULT 'not_booked',
	`consol_training` ENUM('not_booked', 'booked', 'completed') NOT NULL DEFAULT 'not_booked',
	`consol_training_at` DATETIME,
	`availability` VARCHAR(1024),
	`preferences` VARCHAR(1024),
	`notes` VARCHAR(1024),
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
	
	FOREIGN KEY (`coach_id`) REFERENCES `users`(`user_id`),
	FOREIGN KEY (`coordinator_id`) REFERENCES `users`(`user_id`),
	FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`affiliate_id`),
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`area_id`)
);

CREATE TABLE `coordinators` (
	`coordinator_id` INT PRIMARY KEY,
	`affiliate_id` INT NOT NULL,

	FOREIGN KEY (`coordinator_id`) REFERENCES `users`(`user_id`),
	FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`affiliate_id`)
);

CREATE TABLE `readers` (
	`reader_id` INT AUTO_INCREMENT PRIMARY KEY,
	`name` VARCHAR(255) NOT NULL,	-- label - not real name
	`affiliate_id` INT NOT NULL,
	`referral_id` INT UNIQUE,
	`area_id` INT,
	`coach_id` INT,
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
	`TP1_certificate` BOOLEAN NOT NULL DEFAULT FALSE,
	`TP2_certificate` BOOLEAN NOT NULL DEFAULT FALSE,
	`TP3_certificate` BOOLEAN NOT NULL DEFAULT FALSE,
	`TP4_certificate` BOOLEAN NOT NULL DEFAULT FALSE,
	`TP5_certificate` BOOLEAN NOT NULL DEFAULT FALSE,
	`ons4_1` BOOLEAN NOT NULL DEFAULT FALSE,
	`ons4_2` BOOLEAN NOT NULL DEFAULT FALSE,
	`ons4_3` BOOLEAN NOT NULL DEFAULT FALSE,
	
	FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`affiliate_id`),
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`area_id`),
	FOREIGN KEY (`coach_id`) REFERENCES `users`(`user_id`),
	FOREIGN KEY (`referral_id`) REFERENCES `referrals`(`referral_id`),
	
	UNIQUE KEY `unique_reader_affiliate` (`name`, `affiliate_id`)
);

DELIMITER //
CREATE TRIGGER set_level_before_insert
BEFORE INSERT ON readers
FOR EACH ROW
BEGIN
    IF NEW.TP5_start_at IS NOT NULL THEN
        SET NEW.level = 'TP5';
    ELSEIF NEW.TP4_start_at IS NOT NULL THEN
        SET NEW.level = 'TP4';
    ELSEIF NEW.TP3_start_at IS NOT NULL THEN
        SET NEW.level = 'TP3';
    ELSEIF NEW.TP2_start_at IS NOT NULL THEN
        SET NEW.level = 'TP2';
    ELSE
        SET NEW.level = 'TP1';
    END IF;
END;
//

DELIMITER ;

-- UPDATE trigger:
DELIMITER //
CREATE TRIGGER set_level_before_update
BEFORE UPDATE ON readers
FOR EACH ROW
BEGIN
    IF NEW.TP5_start_at IS NOT NULL THEN
        SET NEW.level = 'TP5';
    ELSEIF NEW.TP4_start_at IS NOT NULL THEN
        SET NEW.level = 'TP4';
    ELSEIF NEW.TP3_start_at IS NOT NULL THEN
        SET NEW.level = 'TP3';
    ELSEIF NEW.TP2_start_at IS NOT NULL THEN
        SET NEW.level = 'TP2';
    ELSE
        SET NEW.level = 'TP1';
    END IF;
END;
//

DELIMITER ;

CREATE TABLE `loans` (
	`loan_id` INT AUTO_INCREMENT PRIMARY KEY,
	`reader_id` INT NOT NULL,
	`item` VARCHAR(255) NOT NULL,
	`loan_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`return_date` DATETIME,
	`status` ENUM('loaned', 'returned', 'lost') NOT NULL DEFAULT 'loaned',
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY (`reader_id`) REFERENCES `readers`(`reader_id`)
);

CREATE TABLE `comments` (
	`comment_id` INT AUTO_INCREMENT PRIMARY KEY,
	`reader_id` INT NOT NULL,
	`comment` VARCHAR(2048) NOT NULL,
	`comment_at` DATETIME NOT NULL,
	`quote_permission` BOOLEAN NOT NULL DEFAULT FALSE,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY (`reader_id`) REFERENCES `readers`(`reader_id`)
);

CREATE TABLE `coach_notes` (
	`note_id` INT AUTO_INCREMENT PRIMARY KEY,
	`about_id` INT NOT NULL,
	`by_id` INT NOT NULL,
	`note` VARCHAR(1024) NOT NULL,
	`note_at` DATETIME NOT NULL,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY (`about_id`) REFERENCES `users`(`user_id`),
	FOREIGN KEY (`by_id`) REFERENCES `users`(`user_id`)
);

CREATE TABLE `reader_notes` (
	`note_id` INT AUTO_INCREMENT PRIMARY KEY,
	`about_id` INT NOT NULL,
	`by_id` INT NOT NULL,
	`note` VARCHAR(1024) NOT NULL,
	`note_at` DATETIME NOT NULL,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,

	FOREIGN KEY (`about_id`) REFERENCES `readers`(`reader_id`),
	FOREIGN KEY (`by_id`) REFERENCES `users`(`user_id`)
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
	FOREIGN KEY (`venue_id`) REFERENCES `orgs`(`org_id`)
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
	FOREIGN KEY (`venue_id`) REFERENCES `orgs`(`org_id`)
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
	FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`affiliate_id`)
);

CREATE TABLE `viewers` (
	`viewer_id` INT PRIMARY KEY,
	`affiliate_id` INT NOT NULL,

	FOREIGN KEY (`viewer_id`) REFERENCES `users`(`user_id`),
	FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`affiliate_id`)
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
				'password_reset', 'other', 'admin', 'org_added', 
				'org_edited', 'contact_added', 'contact_edited',
				'referral_added', 'referral_edited') NOT NULL,    
    `description` VARCHAR(255) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`affiliate_id`),
    FOREIGN KEY (`performed_by_id`) REFERENCES `users`(`user_id`),
    FOREIGN KEY (`performed_on_id`) REFERENCES `users`(`user_id`)
);

CREATE TABLE `password_reset` (
	`email` VARCHAR(255) NOT NULL,
	`token` VARCHAR(255) NOT NULL UNIQUE,   -- hash
	`expiry` DATETIME DEFAULT (CURRENT_TIMESTAMP + INTERVAL 1 HOUR)
);
