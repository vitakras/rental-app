import type { createApplicationService } from "~/services/application.service";
import type { createAuthService } from "~/services/auth.service";
import type { createFileService } from "~/services/file.service";

export interface AppServices {
	authService: ReturnType<typeof createAuthService>;
	applicationService: ReturnType<typeof createApplicationService>;
	fileService: ReturnType<typeof createFileService>;
}
