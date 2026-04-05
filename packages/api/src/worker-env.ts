export interface CloudflareBindings {
	DB: D1Database;
	STORAGE: R2Bucket;
	NODE_ENV?: string;
	API_BASE_URL?: string;
	WEB_BASE_URL?: string;
	AUTH_APPLICANT_SIGNUP_TOKEN?: string;
	AUTH_LANDLORD_SIGNUP_TOKEN?: string;
	AUTH_LOGIN_CODE_TTL_SECONDS?: string;
	AUTH_SESSION_TTL_SECONDS?: string;
	AUTH_SESSION_COOKIE_NAME?: string;
	AUTH_LOGIN_CODE_PEPPER?: string;
}
