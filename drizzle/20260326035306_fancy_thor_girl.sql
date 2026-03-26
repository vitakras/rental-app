CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text NOT NULL,
	`desiredMoveInDate` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `residents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`applicationId` integer NOT NULL,
	`fullName` text NOT NULL,
	`isAdult` integer NOT NULL,
	FOREIGN KEY (`applicationId`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action
);
