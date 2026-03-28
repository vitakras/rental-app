import { db as defaultDb } from "~/db";
import { applicationsTable, residentsTable } from "~/db/schema";
import type { ResidentRole } from "~/db/schema";

type DbInstance = typeof defaultDb;

// ── Input types ───────────────────────────────────────────────────────────────

interface OwnerInput {
  fullName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
}

interface AdditionalAdultInput {
  fullName: string;
  dateOfBirth: string;
  role: "co-applicant" | "dependent";
  email?: string;
}

interface ChildInput {
  fullName: string;
  dateOfBirth: string;
}

export interface CreateApplicationInput {
  desiredMoveInDate: string;
  owner: OwnerInput;
  additionalAdults: AdditionalAdultInput[];
  children: ChildInput[];
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function applicationRepository(db: DbInstance = defaultDb) {
  return {
    async create(input: CreateApplicationInput) {
      return db.transaction(async (tx) => {
        const [application] = await tx
          .insert(applicationsTable)
          .values({
            status: "pending",
            desiredMoveInDate: input.desiredMoveInDate,
            smokes: false,
          })
          .returning();

        await tx.insert(residentsTable).values([
          {
            applicationId: application.id,
            role: "primary" as ResidentRole,
            fullName: input.owner.fullName,
            dateOfBirth: input.owner.dateOfBirth,
            email: input.owner.email,
            phone: input.owner.phone,
          },
          ...input.additionalAdults.map((adult) => ({
            applicationId: application.id,
            role: adult.role as ResidentRole,
            fullName: adult.fullName,
            dateOfBirth: adult.dateOfBirth,
            email: adult.email ?? null,
            phone: null,
          })),
          ...input.children.map((child) => ({
            applicationId: application.id,
            role: "child" as ResidentRole,
            fullName: child.fullName,
            dateOfBirth: child.dateOfBirth,
            email: null,
            phone: null,
          })),
        ]);

        return application;
      });
    },
  };
}
