import { describe, it, expect, mock } from "bun:test";
import { createApplication } from "../createApplication.service";
import type { ApplicationRepository } from "../createApplication.service";

const baseInput = {
  desiredMoveInDate: "2026-06-01",
  owner: {
    fullName: "Alex Johnson",
    dateOfBirth: "1990-05-15",
    email: "alex@example.com",
    phone: "555-000-0001",
  },
  additionalAdults: [],
  children: [],
};

function makeRepo(overrides?: Partial<ApplicationRepository>): ApplicationRepository {
  return {
    create: mock(async () => ({ id: 1 })),
    ...overrides,
  };
}

describe("createApplication", () => {
  describe("validation", () => {
    it("rejects a missing desiredMoveInDate", async () => {
      const repo = makeRepo();
      const result = await createApplication(repo, {
        ...baseInput,
        desiredMoveInDate: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.path.includes("desiredMoveInDate"))).toBe(true);
      }
    });

    it("rejects an invalid date format", async () => {
      const repo = makeRepo();
      const result = await createApplication(repo, {
        ...baseInput,
        desiredMoveInDate: "06/01/2026",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.path.includes("desiredMoveInDate"))).toBe(true);
      }
    });

    it("rejects a missing owner fullName", async () => {
      const repo = makeRepo();
      const result = await createApplication(repo, {
        ...baseInput,
        owner: { ...baseInput.owner, fullName: "" },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.path.join(".").includes("owner.fullName"))).toBe(true);
      }
    });

    it("rejects an invalid owner email", async () => {
      const repo = makeRepo();
      const result = await createApplication(repo, {
        ...baseInput,
        owner: { ...baseInput.owner, email: "not-an-email" },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.path.join(".").includes("owner.email"))).toBe(true);
      }
    });

    it("rejects an invalid role for additional adult", async () => {
      const repo = makeRepo();
      const result = await createApplication(repo, {
        ...baseInput,
        additionalAdults: [
          {
            fullName: "Jane Smith",
            dateOfBirth: "1992-03-20",
            role: "primary" as "co-applicant",
          },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.path.some((p) => p === "role"))).toBe(true);
      }
    });

    it("rejects an invalid email for additional adult", async () => {
      const repo = makeRepo();
      const result = await createApplication(repo, {
        ...baseInput,
        additionalAdults: [
          {
            fullName: "Jane Smith",
            dateOfBirth: "1992-03-20",
            role: "co-applicant",
            email: "bad-email",
          },
        ],
      });

      expect(result.success).toBe(false);
    });

    it("rejects a missing child fullName", async () => {
      const repo = makeRepo();
      const result = await createApplication(repo, {
        ...baseInput,
        children: [{ fullName: "", dateOfBirth: "2020-01-01" }],
      });

      expect(result.success).toBe(false);
    });
  });

  describe("success path", () => {
    it("calls repo.create with validated data and returns applicationId", async () => {
      const repo = makeRepo();
      const result = await createApplication(repo, baseInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.applicationId).toBe(1);
      }
      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(repo.create).toHaveBeenCalledWith({
        desiredMoveInDate: "2026-06-01",
        owner: baseInput.owner,
        additionalAdults: [],
        children: [],
      });
    });

    it("does not call repo.create when validation fails", async () => {
      const repo = makeRepo();
      await createApplication(repo, { ...baseInput, desiredMoveInDate: "" });

      expect(repo.create).not.toHaveBeenCalled();
    });

    it("passes optional adult email through when provided", async () => {
      const repo = makeRepo();
      const result = await createApplication(repo, {
        ...baseInput,
        additionalAdults: [
          {
            fullName: "Jane Smith",
            dateOfBirth: "1992-03-20",
            role: "co-applicant",
            email: "jane@example.com",
          },
        ],
      });

      expect(result.success).toBe(true);
      expect((repo.create as ReturnType<typeof mock>).mock.calls[0][0].additionalAdults[0].email).toBe(
        "jane@example.com",
      );
    });

    it("omits optional adult email when not provided", async () => {
      const repo = makeRepo();
      await createApplication(repo, {
        ...baseInput,
        additionalAdults: [
          {
            fullName: "Bob Jones",
            dateOfBirth: "1988-07-11",
            role: "dependent",
          },
        ],
      });

      const callArg = (repo.create as ReturnType<typeof mock>).mock.calls[0][0];
      expect(callArg.additionalAdults[0].email).toBeUndefined();
    });
  });

  describe("repository errors", () => {
    it("propagates errors thrown by repo.create", async () => {
      const repo = makeRepo({
        create: mock(async () => {
          throw new Error("DB error");
        }),
      });

      await expect(createApplication(repo, baseInput)).rejects.toThrow("DB error");
    });
  });
});
