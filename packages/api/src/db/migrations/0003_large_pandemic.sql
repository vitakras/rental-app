CREATE INDEX `application_documents_application_id_idx` ON `application_documents` (`application_id`);--> statement-breakpoint
CREATE INDEX `application_documents_file_id_idx` ON `application_documents` (`file_id`);--> statement-breakpoint
CREATE INDEX `application_documents_resident_id_idx` ON `application_documents` (`resident_id`);--> statement-breakpoint
CREATE INDEX `applications_created_by_user_id_idx` ON `applications` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `applications_status_idx` ON `applications` (`status`);--> statement-breakpoint
CREATE INDEX `income_sources_resident_id_idx` ON `income_sources` (`resident_id`);--> statement-breakpoint
CREATE INDEX `pets_application_id_idx` ON `pets` (`application_id`);--> statement-breakpoint
CREATE INDEX `residences_application_id_idx` ON `residences` (`application_id`);--> statement-breakpoint
CREATE INDEX `residences_resident_id_idx` ON `residences` (`resident_id`);--> statement-breakpoint
CREATE INDEX `residents_application_id_role_idx` ON `residents` (`application_id`,`role`);