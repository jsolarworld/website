"use client";

import { useActionState } from "react";
import { createStaff, manageStaff, type StaffState } from "@/app/admin/staff/actions";
import { Badge, Button, Card, CardBody, Field, Input, Notice, Select } from "@/components/ui";
import { ROLE_LABEL, STAFF_ROLES, type StaffRole } from "@/lib/admin/permissions";

export interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  twoFactorEnabled: boolean;
  requireTwoFactor: boolean;
  isSelf: boolean;
  createdAt: string;
}

function Reveal({ state }: { state: StaffState }) {
  return (
    <>
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      {state.message && (
        <Notice tone="positive" title={state.message}>
          {state.reveal && (
            <div className="mt-2 space-y-1">
              <p>
                Give them this temporary password now. It is shown <strong>only once</strong>:
              </p>
              <p className="font-mono text-base">{state.reveal.password}</p>
              <p className="text-xs">
                They sign in at /admin/login with {state.reveal.email}, then set up their authenticator app and change the password on the Security page.
              </p>
            </div>
          )}
        </Notice>
      )}
    </>
  );
}

export function StaffManager({ staff }: { staff: StaffRow[] }) {
  const [createState, createAction, creating] = useActionState<StaffState, FormData>(createStaff, {});
  const [rowState, rowAction, working] = useActionState<StaffState, FormData>(manageStaff, {});

  return (
    <div className="space-y-8">
      <Card>
        <CardBody>
          <h2 className="text-title">Add a staff member</h2>
          <form action={createAction} className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field name="name" label="Name">
              {(f) => <Input {...f} autoComplete="off" />}
            </Field>
            <Field name="email" label="Email">
              {(f) => <Input {...f} type="email" autoComplete="off" />}
            </Field>
            <Field name="role" label="Role">
              {(f) => (
                <Select {...f} defaultValue="SALES_REP">
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="sm:col-span-3">
              <Button type="submit" variant="primary" disabled={creating}>
                {creating ? "Creating…" : "Create account"}
              </Button>
            </div>
          </form>
          <div className="mt-4">
            <Reveal state={createState} />
          </div>
        </CardBody>
      </Card>

      <div>
        <h2 className="text-title">Current staff</h2>
        <div className="mt-4">
          <Reveal state={rowState} />
        </div>
        <ul className="mt-4 space-y-3">
          {staff.map((s) => (
            <li key={s.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-strong">
                    {s.name} {s.isSelf && <span className="text-sm font-normal text-muted">(you)</span>}
                  </p>
                  <p className="text-sm text-muted">{s.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={s.twoFactorEnabled ? "positive" : s.requireTwoFactor ? "warning" : "neutral"}>
                    {s.twoFactorEnabled ? "Two-step on" : s.requireTwoFactor ? "Two-step not set up yet" : "Two-step off"}
                  </Badge>
                  <Badge tone="brand">{ROLE_LABEL[s.role]}</Badge>
                </div>
              </div>

              {!s.isSelf && (
                <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-line pt-3">
                  <form action={rowAction} className="flex items-end gap-2">
                    <input type="hidden" name="intent" value="role" />
                    <input type="hidden" name="id" value={s.id} />
                    <Select name="role" defaultValue={s.role} aria-label={`Role for ${s.name}`} className="h-9 w-44 text-sm">
                      {STAFF_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </Select>
                    <Button type="submit" size="sm" variant="outline" disabled={working}>
                      Change role
                    </Button>
                  </form>
                  <form action={rowAction}>
                    <input type="hidden" name="intent" value="reset" />
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" size="sm" variant="outline" disabled={working} title="New temporary password, and they set up their authenticator again">
                      Reset sign-in
                    </Button>
                  </form>
                  <form
                    action={rowAction}
                    onSubmit={(e) => {
                      if (s.requireTwoFactor && !confirm(`Turn off the authenticator requirement for ${s.name}? They will be signed out and will sign in with a password alone.`)) e.preventDefault();
                    }}
                  >
                    <input type="hidden" name="intent" value="twofactor" />
                    <input type="hidden" name="id" value={s.id} />
                    {!s.requireTwoFactor && <input type="hidden" name="require" value="on" />}
                    <Button type="submit" size="sm" variant="outline" disabled={working}>
                      {s.requireTwoFactor ? "Turn two-step off" : "Require two-step"}
                    </Button>
                  </form>
                  <form action={rowAction} onSubmit={(e) => { if (!confirm(`Remove admin access for ${s.name}?`)) e.preventDefault(); }}>
                    <input type="hidden" name="intent" value="remove" />
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" size="sm" variant="danger" disabled={working}>
                      Remove access
                    </Button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
