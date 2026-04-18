CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`library_path` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `authors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`last_name` text NOT NULL,
	`first_name` text,
	`middle_name` text
);
--> statement-breakpoint
CREATE TABLE `book_authors` (
	`book_id` integer NOT NULL,
	`author_id` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `book_genres` (
	`book_id` integer NOT NULL,
	`genre_id` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `books` (
	`id` integer PRIMARY KEY NOT NULL,
	`lib_id` integer NOT NULL,
	`title` text NOT NULL,
	`series` text,
	`series_num` integer,
	`file_size` integer DEFAULT 0 NOT NULL,
	`format` text DEFAULT 'fb2' NOT NULL,
	`date_added` text,
	`lang` text DEFAULT 'ru',
	`deleted` integer DEFAULT 0 NOT NULL,
	`keywords` text,
	`archive_name` text NOT NULL,
	`folder` text DEFAULT '',
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `genres` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `genres_code_unique` ON `genres` (`code`);--> statement-breakpoint
CREATE TABLE `import_status` (
	`id` integer PRIMARY KEY NOT NULL,
	`total_books` integer DEFAULT 0 NOT NULL,
	`imported_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `idx_books_title` ON `books` (`title`);--> statement-breakpoint
CREATE INDEX `idx_books_lang` ON `books` (`lang`);--> statement-breakpoint
CREATE INDEX `idx_books_series` ON `books` (`series`);--> statement-breakpoint
CREATE INDEX `idx_books_deleted` ON `books` (`deleted`);--> statement-breakpoint
CREATE INDEX `idx_books_lib_id` ON `books` (`lib_id`);--> statement-breakpoint
CREATE INDEX `idx_authors_last_name` ON `authors` (`last_name`);--> statement-breakpoint
CREATE INDEX `idx_authors_first_name` ON `authors` (`first_name`);--> statement-breakpoint
CREATE INDEX `idx_ba_author` ON `book_authors` (`author_id`);--> statement-breakpoint
CREATE INDEX `idx_ba_book` ON `book_authors` (`book_id`);--> statement-breakpoint
CREATE INDEX `idx_bg_genre` ON `book_genres` (`genre_id`);--> statement-breakpoint
CREATE INDEX `idx_bg_book` ON `book_genres` (`book_id`);--> statement-breakpoint
INSERT OR IGNORE INTO `app_settings` (`id`, `library_path`) VALUES (1, '');