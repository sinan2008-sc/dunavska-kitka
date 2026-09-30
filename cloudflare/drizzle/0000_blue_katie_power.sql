CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`id` text PRIMARY KEY NOT NULL,
	`poll_id` text NOT NULL,
	`voter` text NOT NULL,
	`answer` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vote_once` ON `votes` (`poll_id`,`voter`);