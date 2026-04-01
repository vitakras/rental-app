# Plan: Make Occupants Page Editable

## Context

The occupants form at `/a/applications/:id/occupants` has two problems:
1. It never loads existing data — returning users see a blank form
2. Its save strategy (delete-all + re-insert) would orphan income sources linked to old resident IDs

The income step stores `residentId` directly, so resident IDs must be stable across edits.

**Goal:**
- Pre-populate the form from saved data
- Save = upsert (UPDATE existing residents by ID, INSERT new ones, never bulk-delete)
- Remove = a dedicated action with an inline confirmation warning, which cascades deletes properly

---

## Files Changed

**Frontend:**
- `packages/web/app/routes/applicants/application-occupants.tsx`

**Backend:**
- `packages/api/src/services/application.service.ts`
- `packages/api/src/repositories/application.repository.ts`
- `packages/api/src/routes/applicant/applications.routes.ts`

---

## Backend Changes

### 1. Add `existingId` to validation schemas (`application.service.ts`)

Add optional `existingId` to `additionalAdultSchema` and `childSchema`:

```ts
const additionalAdultSchema = z.object({
  existingId: z.number().int().positive().optional(),
  fullName: z.string().min(1, { error: "Full name is required" }),
  dateOfBirth: dateString,
  role: z.enum(["co-applicant", "dependent"]),
  email: z.email({ error: "Invalid email address" }).optional(),
});

const childSchema = z.object({
  existingId: z.number().int().positive().optional(),
  fullName: z.string().min(1, { error: "Full name is required" }),
  dateOfBirth: dateString,
});
```

### 2. Update `updateOccupants` repository method (`application.repository.ts`)

Replace the delete-all + re-insert with upsert logic:

```ts
async updateOccupants(id: number, input: UpdateOccupantsInput) {
  return db.transaction(async (tx) => {
    // Update smokes flag
    await tx
      .update(applicationsTable)
      .set({ smokes: input.smokes })
      .where(eq(applicationsTable.id, id));

    // Process additional adults and children
    const allResidents = [
      ...input.additionalAdults.map((a) => ({ ...a, role: a.role as ResidentRole })),
      ...input.children.map((c) => ({ ...c, role: "child" as ResidentRole })),
    ];

    for (const resident of allResidents) {
      if (resident.existingId) {
        // UPDATE existing resident (preserves ID → income sources stay intact)
        await tx
          .update(residentsTable)
          .set({
            fullName: resident.fullName,
            dateOfBirth: resident.dateOfBirth,
            role: resident.role,
            email: "email" in resident ? (resident.email ?? null) : null,
          })
          .where(
            and(
              eq(residentsTable.id, resident.existingId),
              eq(residentsTable.applicationId, id),
            ),
          );
      } else {
        // INSERT new resident
        await tx.insert(residentsTable).values({
          applicationId: id,
          role: resident.role,
          fullName: resident.fullName,
          dateOfBirth: resident.dateOfBirth,
          email: "email" in resident ? (resident.email ?? null) : null,
          phone: null,
        });
      }
    }

    // Pets: still safe to delete-all + re-insert (no downstream FK references)
    await tx.delete(petsTable).where(eq(petsTable.applicationId, id));
    if (input.pets.length > 0) {
      await tx.insert(petsTable).values(
        input.pets.map((pet) => ({
          applicationId: id,
          type: pet.type,
          name: pet.name ?? null,
          breed: pet.breed ?? null,
          notes: pet.notes ?? null,
        })),
      );
    }
  });
},
```

### 3. Add `deleteResident` repository method (`application.repository.ts`)

```ts
async deleteResident(applicationId: number, residentId: number) {
  return db.transaction(async (tx) => {
    // Cascade: income sources
    await tx
      .delete(incomeSourcesTable)
      .where(eq(incomeSourcesTable.residentId, residentId));

    // Cascade: application documents (unlink — residentId is nullable)
    await tx
      .update(applicationDocumentsTable)
      .set({ residentId: null })
      .where(eq(applicationDocumentsTable.residentId, residentId));

    // Cascade: application access
    await tx
      .delete(applicationAccessTable)
      .where(eq(applicationAccessTable.residentId, residentId));

    // Delete the resident (guard: must not be "primary" role)
    await tx
      .delete(residentsTable)
      .where(
        and(
          eq(residentsTable.id, residentId),
          eq(residentsTable.applicationId, applicationId),
          not(eq(residentsTable.role, "primary")),
        ),
      );
  });
},
```

### 4. Add `deleteResident` service method (`application.service.ts`)

```ts
async deleteResident(
  applicationId: number,
  residentId: number,
): Promise<{ success: boolean }> {
  logger.info({ applicationId, residentId }, "Deleting resident");
  await applicationRepository.deleteResident(applicationId, residentId);
  logger.info({ applicationId, residentId }, "Resident deleted");
  return { success: true };
},
```

### 5. Add DELETE route (`applications.routes.ts`)

```ts
.delete("/:id/residents/:residentId", ensureValidApplicationId, async (c) => {
  const id = parseApplicationId(c.req.param("id"));
  const residentId = Number(c.req.param("residentId"));

  if (!id || !Number.isInteger(residentId) || residentId <= 0) {
    return c.json({ error: "invalid_id" }, 400);
  }

  await applicationService.deleteResident(id, residentId);
  return c.json({ success: true }, 200);
})
```

---

## Frontend Changes (`application-occupants.tsx`)

### 6. Update types to carry `existingId`

```ts
interface AdditionalAdult {
  id: string;          // local React key only
  existingId?: number; // DB resident.id — present for pre-loaded records
  name: string;
  role: AdultRole | null;
  email: string;
  dob: string;
}

interface Child {
  id: string;
  existingId?: number;
  name: string;
  dob: string;
}
```

### 7. Expand `clientLoader` to return existing data

```ts
export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) throw data(null, { status: 404 });

  const response = await apiClient.applications[":id"].$get({
    param: { id: String(id) },
  });

  if (response.status === 404) throw data(null, { status: 404 });
  if (!response.ok) throw data(null, { status: response.status });

  const { application } = await response.json();

  const additionalAdults = application.residents
    .filter((r) => r.role === "co-applicant" || r.role === "dependent")
    .map((r) => ({
      id: Math.random().toString(36).slice(2),
      existingId: r.id,
      name: r.fullName,
      role: r.role as AdultRole,
      email: r.email ?? "",
      dob: r.dateOfBirth,
    }));

  const children = application.residents
    .filter((r) => r.role === "child")
    .map((r) => ({
      id: Math.random().toString(36).slice(2),
      existingId: r.id,
      name: r.fullName,
      dob: r.dateOfBirth,
    }));

  const pets = application.pets.map((p) => ({
    id: Math.random().toString(36).slice(2),
    type: p.type,
    name: p.name ?? "",
    breed: p.breed ?? "",
    notes: p.notes ?? "",
  }));

  return {
    applicationId: id,
    smokes: application.smokes as boolean | null,
    additionalAdults,
    children,
    pets,
    hasPets: pets.length > 0 ? true : null,
  };
}
```

### 8. Split `clientAction` into two intents

```ts
export async function clientAction({ request, params }: Route.ClientActionArgs) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) throw data(null, { status: 404 });

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // ── Remove resident ──
  if (intent === "remove_resident") {
    const residentId = formData.get("residentId") as string;
    const response = await apiClient.applications[":id"].residents[":residentId"].$delete({
      param: { id: String(id), residentId },
    });
    if (!response.ok) throw data(null, { status: response.status });
    return { removed: true };
  }

  // ── Save occupants ──
  const raw = JSON.parse(formData.get("data") as string);
  const response = await apiClient.applications[":id"].occupants.$put({
    param: { id: String(id) },
    json: raw,
  });

  if (response.status === 422) {
    const result = await response.json();
    return { errors: result.issues };
  }
  if (!response.ok) throw data(null, { status: response.status });

  return redirect(`/a/applications/${id}/income`);
}
```

### 9. Seed `useState` from `loaderData`, wire Back button

```tsx
export default function ApplicationOccupants({ loaderData }: Route.ComponentProps) {
  const submit = useSubmit();
  const navigate = useNavigate();

  const [adults, setAdults] = useState(1 + loaderData.additionalAdults.length);
  const [additionalAdults, setAdditionalAdults] = useState<AdditionalAdult[]>(loaderData.additionalAdults);
  const [children, setChildren] = useState(loaderData.children.length);
  const [childList, setChildList] = useState<Child[]>(loaderData.children);
  const [hasPets, setHasPets] = useState<boolean | null>(loaderData.hasPets);
  const [pets, setPets] = useState<Pet[]>(loaderData.pets);
  const [smokes, setSmokes] = useState<boolean | null>(loaderData.smokes);
```

Add `useNavigate` to the `react-router` import. Wire the Back button:

```tsx
onClick={() => navigate(`/a/applications/${loaderData.applicationId}/applicant`)}
```

### 10. `confirmingRemove` state + remove handlers

```ts
const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null);

function removeAdult(adult: AdditionalAdult) {
  setAdditionalAdults((prev) => prev.filter((a) => a.id !== adult.id));
  setAdults((prev) => prev - 1);
  setConfirmingRemove(null);
  if (adult.existingId) {
    const fd = new FormData();
    fd.set("intent", "remove_resident");
    fd.set("residentId", String(adult.existingId));
    submit(fd, { method: "post" });
  }
}

function removeChild(child: Child) {
  setChildList((prev) => prev.filter((c) => c.id !== child.id));
  setChildren((prev) => prev - 1);
  setConfirmingRemove(null);
  if (child.existingId) {
    const fd = new FormData();
    fd.set("intent", "remove_resident");
    fd.set("residentId", String(child.existingId));
    submit(fd, { method: "post" });
  }
}
```

### 11. Inline confirmation UI in adult and child cards

Replace the `<RemoveButton>` click with `onClick={() => setConfirmingRemove(adult.id)}`.

When `confirmingRemove === adult.id`, render a warning panel instead of the normal card body:

```tsx
{confirmingRemove === adult.id ? (
  <div className="rounded-xl bg-[#FDF0E9] border-2 border-[#C4714A] p-4">
    <p className="text-sm font-medium text-[#1C1A17] mb-1">
      Remove {adult.name || "this person"}?
    </p>
    {adult.existingId && (
      <p className="text-xs text-[#7A7268] mb-4 leading-relaxed">
        This will permanently delete their income sources and any other
        information they've submitted. This cannot be undone.
      </p>
    )}
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setConfirmingRemove(null)}
        className="flex-1 py-2 rounded-xl border-2 border-[#E8E1D9] text-sm text-[#7A7268]"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() => removeAdult(adult)}
        className="flex-1 py-2 rounded-xl bg-[#C4714A] text-white text-sm font-medium"
      >
        Remove
      </button>
    </div>
  </div>
) : (
  /* existing card content */
)}
```

Apply the same pattern to child cards using `removeChild(child)`.

### 12. Pass `existingId` in save payload

In the Continue button's `submit(...)` call:

```ts
additionalAdults: additionalAdults.map((a) => ({
  existingId: a.existingId,
  fullName: a.name,
  dateOfBirth: a.dob,
  role: a.role,
  email: a.email || undefined,
})),
children: childList.map((c) => ({
  existingId: c.existingId,
  fullName: c.name,
  dateOfBirth: c.dob,
})),
```

---

## Data Flow Summary

| Action | What happens |
|--------|-------------|
| Load page | GET /applications/:id → pre-populate all fields with existing resident IDs |
| Edit a field | Local state only until Continue |
| Click Continue | PUT /occupants → UPDATE existing residents by ID, INSERT new ones, replace pets |
| Click × on a card | Show inline confirmation |
| Confirm remove (existing resident) | DELETE /applications/:id/residents/:residentId → cascades income/docs/access → removes from UI |
| Confirm remove (new, unsaved) | Remove from local state only — no API call |
| Cancel remove | Dismiss, nothing changes |

---

## Verification

1. Save occupants with 2 adults + 1 child → add income sources → return to occupants page → all fields pre-filled, income untouched
2. Edit an adult's name → Continue → income step still shows that resident with income sources intact
3. Remove an existing adult → see warning mentioning income sources → confirm → resident gone from income step
4. Remove a newly-added (unsaved) adult → simpler prompt, no data-loss warning → confirm → card gone, no API call fired
5. Add a brand-new adult → Continue → new resident inserted alongside the existing updated ones
