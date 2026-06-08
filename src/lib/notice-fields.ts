export type FieldType = "boolean" | "enum" | "text" | "tags" | "staff";

export interface NoticeFieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  optionsUrl?: string;
  optionsLabelKey?: string;
  group: "Invite" | "Person";
}

export interface OperatorDef {
  value: string;
  label: string;
  hasValue: boolean;
}

export interface NoticeCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export const NOTICE_FIELDS: NoticeFieldDef[] = [
  // ── Invite ──────────────────────────────────────────────────────────────────
  { key: "rsvpStatus",            label: "RSVP Status",              type: "enum",    options: ["PENDING","YES","NO","MAYBE"],     group: "Invite" },
  { key: "ticketType",            label: "Ticket Type",              type: "enum",    options: ["Regular","Comp","Press","Staff","VIP","Sponsor","Table"], group: "Invite" },
  { key: "group",                 label: "Group",                    type: "text",                                                 group: "Invite" },
  { key: "meal",                  label: "Meal",                     type: "enum",    options: ["Standard","Kosher","Vegan","Vegetarian"],           group: "Invite" },
  { key: "dietary",               label: "Dietary Restriction",      type: "text",    optionsUrl: "/api/lookup/dietary-options",   optionsLabelKey: "name",     group: "Invite" },
  { key: "isGuest",               label: "Is Guest",                 type: "boolean",                                              group: "Invite" },
  { key: "isPlaceholder",         label: "Is Placeholder",           type: "boolean",                                              group: "Invite" },
  { key: "isSeated",              label: "Is Seated",                type: "boolean",                                              group: "Invite" },
  { key: "attended",              label: "Attended",                 type: "boolean",                                              group: "Invite" },
  { key: "hasDietaryRestrictions",label: "Has Dietary Restrictions", type: "boolean",                                              group: "Invite" },
  { key: "hasSeatingRequest",     label: "Has Seating Request",      type: "boolean",                                              group: "Invite" },
  { key: "hasTableRequest",       label: "Has Table Request",        type: "boolean",                                              group: "Invite" },
  { key: "hasEmail",              label: "Has Email on File",        type: "boolean",                                              group: "Invite" },
  { key: "hasNotes",              label: "Has Notes",                type: "boolean",                                              group: "Invite" },
  { key: "hasPaid",               label: "Has Paid",                 type: "boolean",                                              group: "Invite" },
  // ── Person ──────────────────────────────────────────────────────────────────
  { key: "person.status",         label: "Person Status",            type: "enum",    options: ["ACTIVE","INACTIVE","DECEASED"],   group: "Person" },
  { key: "person.city",           label: "City",                     type: "text",                                                 group: "Person" },
  { key: "person.state",          label: "State",                    type: "text",                                                 group: "Person" },
  { key: "person.tags",           label: "Person Tag",               type: "tags",                                                 group: "Person" },
  { key: "person.assignedTo",     label: "Assigned To",              type: "staff",                                                group: "Person" },
  { key: "person.orgType",        label: "Organization Type",        type: "text",    optionsUrl: "/api/lookup/organization-types", optionsLabelKey: "typeName", group: "Person" },
];

export const OPERATORS: Record<FieldType, OperatorDef[]> = {
  boolean: [
    { value: "is_true",       label: "is true",          hasValue: false },
    { value: "is_false",      label: "is false",         hasValue: false },
  ],
  enum: [
    { value: "is",            label: "is",               hasValue: true },
    { value: "is_not",        label: "is not",           hasValue: true },
    { value: "is_any_of",     label: "is any of",        hasValue: true },
  ],
  text: [
    { value: "is",            label: "is exactly",       hasValue: true },
    { value: "is_not",        label: "is not",           hasValue: true },
    { value: "contains",      label: "contains",         hasValue: true },
    { value: "not_contains",  label: "does not contain", hasValue: true },
    { value: "is_empty",      label: "is empty",         hasValue: false },
    { value: "is_not_empty",  label: "is not empty",     hasValue: false },
  ],
  tags: [
    { value: "has_any_of",    label: "has any of",       hasValue: true },
    { value: "has_all_of",    label: "has all of",       hasValue: true },
    { value: "has_none_of",   label: "has none of",      hasValue: true },
    { value: "has_any",       label: "has any tag",      hasValue: false },
    { value: "has_none",      label: "has no tags",      hasValue: false },
  ],
  staff: [
    { value: "is",            label: "is assigned to",   hasValue: true },
    { value: "is_not",        label: "is not assigned to", hasValue: true },
    { value: "is_assigned",   label: "is assigned (anyone)", hasValue: false },
    { value: "is_unassigned", label: "is unassigned",    hasValue: false },
  ],
};

export function defaultOperator(type: FieldType): string {
  return OPERATORS[type][0].value;
}

// ── Evaluation engine ────────────────────────────────────────────────────────

export interface EvalInvite {
  rsvpStatus: string;
  ticketType: string;
  group: string;
  meal: string;
  dietary: string[];
  notes: string | null;
  tableId: string | null;
  isGuest: boolean;
  isPlaceholder: boolean;
  attended: boolean;
  seatingRequest: string | null;
  tableRequest: string | null;
  peopleId: string | null;
  guestEmail: string | null;
  person: {
    email1: string | null;
    email2: string | null;
    status: string;
    city: string | null;
    state: string | null;
    assignedTo: { id: string } | null;
    tags: { tag: { id: string; name: string } }[];
    partnerRoles: { partner: { organizationType: { typeName: string } | null } }[];
  } | null;
}

export interface EvalContext {
  paidPeopleIds: Set<string>;
}

function str(s: string | null | undefined): string {
  return s ?? "";
}

function evalCondition(invite: EvalInvite, condition: NoticeCondition, context: EvalContext): boolean {
  const { field, operator, value } = condition;
  const vals = value ? value.split(",").map((v) => v.trim()).filter(Boolean) : [];

  switch (field) {
    // ── RSVP Status ──────────────────────────────────────────────────────────
    case "rsvpStatus":
      if (operator === "is")       return invite.rsvpStatus === value;
      if (operator === "is_not")   return invite.rsvpStatus !== value;
      if (operator === "is_any_of") return vals.includes(invite.rsvpStatus);
      break;

    // ── Ticket Type ──────────────────────────────────────────────────────────
    case "ticketType":
      if (operator === "is")        return invite.ticketType === value;
      if (operator === "is_not")    return invite.ticketType !== value;
      if (operator === "is_any_of") return vals.includes(invite.ticketType);
      break;

    // ── Group ────────────────────────────────────────────────────────────────
    case "group": {
      const g = invite.group.toLowerCase();
      const v = value.toLowerCase();
      if (operator === "is")          return g === v;
      if (operator === "is_not")      return g !== v;
      if (operator === "contains")    return g.includes(v);
      if (operator === "not_contains") return !g.includes(v);
      if (operator === "is_empty")    return !invite.group.trim();
      if (operator === "is_not_empty") return !!invite.group.trim();
      break;
    }

    // ── Meal ─────────────────────────────────────────────────────────────────
    case "meal":
      if (operator === "is")        return invite.meal === value;
      if (operator === "is_not")    return invite.meal !== value;
      if (operator === "is_any_of") return vals.includes(invite.meal);
      break;

    // ── Dietary ──────────────────────────────────────────────────────────────
    case "dietary": {
      const d = invite.dietary.join(",").toLowerCase();
      const v = value.toLowerCase();
      if (operator === "contains")    return d.includes(v);
      if (operator === "not_contains") return !d.includes(v);
      if (operator === "is_empty")    return invite.dietary.length === 0;
      if (operator === "is_not_empty") return invite.dietary.length > 0;
      break;
    }

    // ── Boolean invite fields ─────────────────────────────────────────────────
    case "isGuest":
      return operator === "is_true" ? invite.isGuest : !invite.isGuest;
    case "isPlaceholder":
      return operator === "is_true" ? invite.isPlaceholder : !invite.isPlaceholder;
    case "isSeated":
      return operator === "is_true" ? invite.tableId !== null : invite.tableId === null;
    case "attended":
      return operator === "is_true" ? invite.attended : !invite.attended;
    case "hasDietaryRestrictions":
      return operator === "is_true" ? invite.dietary.length > 0 : invite.dietary.length === 0;
    case "hasSeatingRequest":
      return operator === "is_true" ? !!(invite.seatingRequest?.trim()) : !(invite.seatingRequest?.trim());
    case "hasTableRequest":
      return operator === "is_true" ? !!(invite.tableRequest?.trim()) : !(invite.tableRequest?.trim());
    case "hasNotes":
      return operator === "is_true" ? !!(invite.notes?.trim()) : !(invite.notes?.trim());
    case "hasEmail": {
      const email = invite.person?.email1 || invite.person?.email2 || invite.guestEmail;
      return operator === "is_true" ? !!email : !email;
    }
    case "hasPaid": {
      const paid = invite.peopleId ? context.paidPeopleIds.has(invite.peopleId) : false;
      return operator === "is_true" ? paid : !paid;
    }

    // ── Person fields ─────────────────────────────────────────────────────────
    case "person.status":
      if (!invite.person) return false;
      if (operator === "is")        return invite.person.status === value;
      if (operator === "is_not")    return invite.person.status !== value;
      if (operator === "is_any_of") return vals.includes(invite.person.status);
      break;

    case "person.city": {
      const city = str(invite.person?.city).toLowerCase();
      const v = value.toLowerCase();
      if (operator === "is")          return city === v;
      if (operator === "is_not")      return city !== v;
      if (operator === "contains")    return city.includes(v);
      if (operator === "not_contains") return !city.includes(v);
      if (operator === "is_empty")    return !city.trim();
      if (operator === "is_not_empty") return !!city.trim();
      break;
    }

    case "person.state": {
      const state = str(invite.person?.state).toLowerCase();
      const v = value.toLowerCase();
      if (operator === "is")          return state === v;
      if (operator === "is_not")      return state !== v;
      if (operator === "contains")    return state.includes(v);
      if (operator === "not_contains") return !state.includes(v);
      if (operator === "is_empty")    return !state.trim();
      if (operator === "is_not_empty") return !!state.trim();
      break;
    }

    case "person.tags": {
      if (!invite.person) return operator === "has_none" || operator === "has_none_of";
      const tagIds = invite.person.tags.map((t) => t.tag.id);
      if (operator === "has_any_of")  return vals.some((id) => tagIds.includes(id));
      if (operator === "has_all_of")  return vals.every((id) => tagIds.includes(id));
      if (operator === "has_none_of") return !vals.some((id) => tagIds.includes(id));
      if (operator === "has_any")     return tagIds.length > 0;
      if (operator === "has_none")    return tagIds.length === 0;
      break;
    }

    case "person.assignedTo": {
      const assignedId = invite.person?.assignedTo?.id;
      if (operator === "is")           return assignedId === value;
      if (operator === "is_not")       return assignedId !== value;
      if (operator === "is_assigned")  return !!assignedId;
      if (operator === "is_unassigned") return !assignedId;
      break;
    }

    case "person.orgType": {
      if (!invite.person) return operator === "is_empty";
      const types = invite.person.partnerRoles.map((pr) => pr.partner.organizationType?.typeName ?? "");
      const joined = types.join(",").toLowerCase();
      const v = value.toLowerCase();
      if (operator === "is")          return types.some((t) => t.toLowerCase() === v);
      if (operator === "is_not")      return !types.some((t) => t.toLowerCase() === v);
      if (operator === "contains")    return joined.includes(v);
      if (operator === "not_contains") return !joined.includes(v);
      if (operator === "is_empty")    return types.length === 0;
      if (operator === "is_not_empty") return types.length > 0;
      break;
    }
  }
  return false;
}

export function evaluateNotice(
  invite: EvalInvite,
  conditions: NoticeCondition[],
  logic: "AND" | "OR",
  context: EvalContext
): boolean {
  if (conditions.length === 0) return false;
  const results = conditions.map((c) => evalCondition(invite, c, context));
  return logic === "AND" ? results.every(Boolean) : results.some(Boolean);
}
