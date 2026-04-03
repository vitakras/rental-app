import { eq } from "drizzle-orm";
import type { DbInstance } from "~/db";
import type { IncomeSourceType } from "~/db/schema";
import { incomeSourcesTable } from "~/db/schema";

// ── Input types ───────────────────────────────────────────────────────────────

export interface CreateIncomeSourceInput {
	residentId: number;
	type: IncomeSourceType;
	employerOrSourceName: string;
	titleOrOccupation?: string | null;
	monthlyAmountCents: number;
	startDate: string;
	endDate?: string | null;
	notes?: string | null;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function incomeSourceRepository(db: DbInstance) {
	return {
		async createMany(inputs: CreateIncomeSourceInput[]): Promise<void> {
			if (inputs.length === 0) return;
			await db.insert(incomeSourcesTable).values(
				inputs.map((input) => ({
					residentId: input.residentId,
					type: input.type,
					employerOrSourceName: input.employerOrSourceName,
					titleOrOccupation: input.titleOrOccupation ?? null,
					monthlyAmountCents: input.monthlyAmountCents,
					startDate: input.startDate,
					endDate: input.endDate ?? null,
					notes: input.notes ?? null,
				})),
			);
		},

		async findByResidentId(residentId: number) {
			return db
				.select()
				.from(incomeSourcesTable)
				.where(eq(incomeSourcesTable.residentId, residentId));
		},
	};
}
