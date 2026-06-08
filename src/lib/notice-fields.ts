export type FieldType = "boolean" | "enum" | "text" | "number" | "tags" | "staff";

export interface NoticeFieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  optionsUrl?: string;
  optionsLabelKey?: string;
  group: "Invite" | "Person" | "Fundraiser" | "Donation";
  requiresFundraiser?: boolean;
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
  { key: "tableName",           label: "Table",                    type: "text",                                                 group: "Invite" },
  { key: "noteText",            label: "Notes Content",            type: "text",                                                 group: "Invite" },
  { key: "hasSponsoredSeats",   label: "Has Sponsored Seats",      type: "boolean",                                              group: "Invite" },
  // ── Fundraiser ───────────────────────────────────────────────────────────────
  { key: "donation.approvalStatus", label: "Donation Approval",  type: "enum",    options: ["AUTO_APPROVED","MANUALLY_APPROVED","PENDING","REJECTED"], group: "Fundraiser", requiresFundraiser: true },
  { key: "donation.qbSyncStatus",   label: "QB Sync Status",     type: "enum",    options: ["NOT_SYNCED","SYNCED","ERROR"],                            group: "Fundraiser", requiresFundraiser: true },
  { key: "donation.isRecurring",    label: "Recurring Donor",    type: "boolean",                                                                      group: "Fundraiser", requiresFundraiser: true },
  { key: "donation.sponsorshipLevel", label: "Sponsorship Level", type: "text",                                                                         group: "Fundraiser", requiresFundraiser: true },
  { key: "donation.amount",        label: "Donation Amount ($)",  type: "number",                                               group: "Fundraiser", requiresFundraiser: true },
  { key: "donation.paymentMethod", label: "Payment Method",       type: "enum",    options: ["stripe","zeffy","cash","check","ach"], group: "Fundraiser", requiresFundraiser: true },
  // ── Person ───────────────────────────────────────────────────────────────────
  { key: "person.status",         label: "Person Status",            type: "enum",    options: ["ACTIVE","INACTIVE","DECEASED"],   group: "Person" },
  { key: "person.city",           label: "City",                     type: "text",                                                 group: "Person" },
  { key: "person.state",          label: "State",                    type: "text",                                                 group: "Person" },
  { key: "person.tags",           label: "Person Tag",               type: "tags",                                                 group: "Person" },
  { key: "person.assignedTo",     label: "Assigned To",              type: "staff",                                                group: "Person" },
  { key: "person.orgType",        label: "Organization Type",        type: "text",    optionsUrl: "/api/lookup/organization-types", optionsLabelKey: "typeName", group: "Person" },
  { key: "person.hasPhone",     label: "Has Phone Number",         type: "boolean",                                              group: "Person" },
  { key: "person.zip",          label: "Zip Code",                 type: "text",                                                 group: "Person" },
  { key: "person.contactMethod",label: "Preferred Contact Method", type: "text",    optionsUrl: "/api/lookup/communication-methods", optionsLabelKey: "name", group: "Person" },
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
  number: [
    { value: "eq",  label: "equals",                 hasValue: true },
    { value: "neq", label: "does not equal",         hasValue: true },
    { value: "gt",  label: "greater than",           hasValue: true },
    { value: "gte", label: "greater than or equal",  hasValue: true },
    { value: "lt",  label: "less than",              hasValue: true },
    { value: "lte", label: "less than or equal",     hasValue: true },
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
  sponsoredSeats: number | null;
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
    phoneNumber: string | null;
    zip: string | null;
    communicationMethod: string | null;
    assignedTo: { id: string } | null;
    tags: { tag: { id: string; name: string } }[];
    partnerRoles: { partner: { organizationType: { typeName: string } | null } }[];
  } | null;
}

export interface EvalContext {
  paidPeopleIds: Set<string>;
  donationsByPeopleId: Map<string, { approvalStatus: string; qbSyncStatus: string; isRecurring: boolean; sponsorshipLevelName: string | null; amount: number; paymentMethod: string }[]>;
  tableNameMap: Record<string, string>;
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

    case "tableName": {
      const name = invite.tableId ? (context.tableNameMap[invite.tableId] ?? "") : "";
      const v = value.toLowerCase();
      if (operator === "is")           return name.toLowerCase() === v;
      if (operator === "is_not")       return name.toLowerCase() !== v;
      if (operator === "contains")     return name.toLowerCase().includes(v);
      if (operator === "not_contains") return !name.toLowerCase().includes(v);
      if (operator === "is_empty")     return !name;
      if (operator === "is_not_empty") return !!name;
      break;
    }

    case "noteText": {
      const notes = (invite.notes ?? "").toLowerCase();
      const v = value.toLowerCase();
      if (operator === "is")           return notes === v;
      if (operator === "is_not")       return notes !== v;
      if (operator === "contains")     return notes.includes(v);
      if (operator === "not_contains") return !notes.includes(v);
      if (operator === "is_empty")     return !notes.trim();
      if (operator === "is_not_empty") return !!notes.trim();
      break;
    }

    case "hasSponsoredSeats":
      return operator === "is_true"
        ? (invite.sponsoredSeats !== null && invite.sponsoredSeats > 0)
        : !(invite.sponsoredSeats !== null && invite.sponsoredSeats > 0);

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

    case "person.hasPhone":
      return operator === "is_true" ? !!invite.person?.phoneNumber : !invite.person?.phoneNumber;

    case "person.zip": {
      const zip = str(invite.person?.zip).toLowerCase();
      const v = value.toLowerCase();
      if (operator === "is")           return zip === v;
      if (operator === "is_not")       return zip !== v;
      if (operator === "contains")     return zip.includes(v);
      if (operator === "not_contains") return !zip.includes(v);
      if (operator === "is_empty")     return !zip.trim();
      if (operator === "is_not_empty") return !!zip.trim();
      break;
    }

    case "person.contactMethod": {
      const method = (invite.person?.communicationMethod ?? "").toLowerCase();
      const v = value.toLowerCase();
      if (operator === "is")           return method === v;
      if (operator === "is_not")       return method !== v;
      if (operator === "is_empty")     return !method;
      if (operator === "is_not_empty") return !!method;
      break;
    }

    // ── Fundraiser fields ─────────────────────────────────────────────────────
    case "donation.approvalStatus": {
      if (!invite.peopleId) return false;
      const donations = context.donationsByPeopleId.get(invite.peopleId) ?? [];
      if (donations.length === 0) return false;
      if (operator === "is")        return donations.some((d) => d.approvalStatus === value);
      if (operator === "is_not")    return donations.every((d) => d.approvalStatus !== value);
      if (operator === "is_any_of") return donations.some((d) => vals.includes(d.approvalStatus));
      break;
    }

    case "donation.qbSyncStatus": {
      if (!invite.peopleId) return false;
      const donations = context.donationsByPeopleId.get(invite.peopleId) ?? [];
      if (donations.length === 0) return false;
      if (operator === "is")        return donations.some((d) => d.qbSyncStatus === value);
      if (operator === "is_not")    return donations.every((d) => d.qbSyncStatus !== value);
      if (operator === "is_any_of") return donations.some((d) => vals.includes(d.qbSyncStatus));
      break;
    }

    case "donation.isRecurring": {
      if (!invite.peopleId) return false;
      const donations = context.donationsByPeopleId.get(invite.peopleId) ?? [];
      const isRecurring = donations.some((d) => d.isRecurring);
      return operator === "is_true" ? isRecurring : !isRecurring;
    }

    case "donation.sponsorshipLevel": {
      if (!invite.peopleId) return false;
      const donations = context.donationsByPeopleId.get(invite.peopleId) ?? [];
      const levels = donations.map((d) => d.sponsorshipLevelName ?? "").filter(Boolean);
      const v = value.toLowerCase();
      if (operator === "is")           return levels.some((l) => l.toLowerCase() === v);
      if (operator === "is_not")       return !levels.some((l) => l.toLowerCase() === v);
      if (operator === "contains")     return levels.some((l) => l.toLowerCase().includes(v));
      if (operator === "not_contains") return !levels.some((l) => l.toLowerCase().includes(v));
      if (operator === "is_empty")     return levels.length === 0;
      if (operator === "is_not_empty") return levels.length > 0;
      break;
    }

    case "donation.amount": {
      if (!invite.peopleId) return false;
      const donations = context.donationsByPeopleId.get(invite.peopleId) ?? [];
      if (donations.length === 0) return false;
      const inputCents = Math.round(parseFloat(value || "0") * 100);
      const maxAmount = Math.max(...donations.map((d) => d.amount));
      if (operator === "eq")  return donations.some((d) => d.amount === inputCents);
      if (operator === "neq") return donations.every((d) => d.amount !== inputCents);
      if (operator === "gt")  return maxAmount > inputCents;
      if (operator === "gte") return maxAmount >= inputCents;
      if (operator === "lt")  return donations.some((d) => d.amount < inputCents);
      if (operator === "lte") return donations.some((d) => d.amount <= inputCents);
      break;
    }

    case "donation.paymentMethod": {
      if (!invite.peopleId) return false;
      const donations = context.donationsByPeopleId.get(invite.peopleId) ?? [];
      if (donations.length === 0) return false;
      if (operator === "is")        return donations.some((d) => d.paymentMethod === value);
      if (operator === "is_not")    return donations.every((d) => d.paymentMethod !== value);
      if (operator === "is_any_of") return donations.some((d) => vals.includes(d.paymentMethod));
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

// ── Fundraiser Notice Fields ─────────────────────────────────────────────────

export const FUNDRAISER_NOTICE_FIELDS: NoticeFieldDef[] = [
  // ── Donation ─────────────────────────────────────────────────────────────────
  { key: "amount",           label: "Donation Amount ($)",      type: "number",                                                                       group: "Donation" },
  { key: "approvalStatus",   label: "Approval Status",          type: "enum",    options: ["AUTO_APPROVED","MANUALLY_APPROVED","PENDING","REJECTED"],  group: "Donation" },
  { key: "qbSyncStatus",     label: "QB Sync Status",           type: "enum",    options: ["NOT_SYNCED","SYNCED","ERROR"],                             group: "Donation" },
  { key: "isRecurring",      label: "Recurring Donor",          type: "boolean",                                                                      group: "Donation" },
  { key: "sponsorshipLevel", label: "Sponsorship Level",        type: "text",                                                                         group: "Donation" },
  { key: "paymentMethod",    label: "Payment Method",           type: "enum",    options: ["stripe","zeffy","cash","check","ach","online","pledge","other"], group: "Donation" },
  { key: "sponsoredSeats",   label: "Sponsored Seats",          type: "number",                                                                       group: "Donation" },
  { key: "seatsUsed",        label: "Seats Used",               type: "number",                                                                       group: "Donation" },
  { key: "hasSeatDiscrepancy", label: "Has Seat Discrepancy",   type: "boolean",                                                                      group: "Donation" },
  { key: "isAnonymous",      label: "Is Anonymous",             type: "boolean",                                                                      group: "Donation" },
  { key: "hasNotes",         label: "Has Notes",                type: "boolean",                                                                      group: "Donation" },
  { key: "noteText",         label: "Notes Content",            type: "text",                                                                         group: "Donation" },
  // ── Person ───────────────────────────────────────────────────────────────────
  { key: "person.status",       label: "Person Status",            type: "enum",    options: ["ACTIVE","INACTIVE","DECEASED"],                          group: "Person" },
  { key: "person.city",         label: "City",                     type: "text",                                                                       group: "Person" },
  { key: "person.state",        label: "State",                    type: "text",                                                                       group: "Person" },
  { key: "person.zip",          label: "Zip Code",                 type: "text",                                                                       group: "Person" },
  { key: "person.tags",         label: "Person Tag",               type: "tags",                                                                       group: "Person" },
  { key: "person.assignedTo",   label: "Assigned To",              type: "staff",                                                                      group: "Person" },
  { key: "person.orgType",      label: "Organization Type",        type: "text",    optionsUrl: "/api/lookup/organization-types", optionsLabelKey: "typeName", group: "Person" },
  { key: "person.hasPhone",     label: "Has Phone Number",         type: "boolean",                                                                    group: "Person" },
  { key: "person.contactMethod",label: "Preferred Contact Method", type: "text",    optionsUrl: "/api/lookup/communication-methods", optionsLabelKey: "name", group: "Person" },
];

export interface EvalDonation {
  id: string;
  amount: number;
  approvalStatus: string;
  qbSyncStatus: string;
  isRecurring: boolean;
  sponsorshipLevelName: string | null;
  paymentMethod: string;
  sponsoredSeats: number | null;
  seatsUsed: number | null;
  isAnonymous: boolean;
  notes: string | null;
  person: {
    status: string;
    city: string | null;
    state: string | null;
    zip: string | null;
    phoneNumber: string | null;
    email1: string | null;
    email2: string | null;
    communicationMethod: string | null;
    assignedTo: { id: string } | null;
    tags: { tag: { id: string; name: string } }[];
    partnerRoles: { partner: { organizationType: { typeName: string } | null } }[];
  } | null;
}

function evalDonationCondition(donation: EvalDonation, condition: NoticeCondition): boolean {
  const { field, operator, value } = condition;
  const vals = value ? value.split(",").map((v) => v.trim()).filter(Boolean) : [];

  switch (field) {
    case "amount": {
      const inputCents = Math.round(parseFloat(value || "0") * 100);
      if (operator === "eq")  return donation.amount === inputCents;
      if (operator === "neq") return donation.amount !== inputCents;
      if (operator === "gt")  return donation.amount > inputCents;
      if (operator === "gte") return donation.amount >= inputCents;
      if (operator === "lt")  return donation.amount < inputCents;
      if (operator === "lte") return donation.amount <= inputCents;
      break;
    }

    case "approvalStatus":
      if (operator === "is")        return donation.approvalStatus === value;
      if (operator === "is_not")    return donation.approvalStatus !== value;
      if (operator === "is_any_of") return vals.includes(donation.approvalStatus);
      break;

    case "qbSyncStatus":
      if (operator === "is")        return donation.qbSyncStatus === value;
      if (operator === "is_not")    return donation.qbSyncStatus !== value;
      if (operator === "is_any_of") return vals.includes(donation.qbSyncStatus);
      break;

    case "isRecurring":
      return operator === "is_true" ? donation.isRecurring : !donation.isRecurring;

    case "sponsorshipLevel": {
      const level = (donation.sponsorshipLevelName ?? "").toLowerCase();
      const v = value.toLowerCase();
      if (operator === "is")           return level === v;
      if (operator === "is_not")       return level !== v;
      if (operator === "contains")     return level.includes(v);
      if (operator === "not_contains") return !level.includes(v);
      if (operator === "is_empty")     return !level;
      if (operator === "is_not_empty") return !!level;
      break;
    }

    case "paymentMethod":
      if (operator === "is")        return donation.paymentMethod === value;
      if (operator === "is_not")    return donation.paymentMethod !== value;
      if (operator === "is_any_of") return vals.includes(donation.paymentMethod);
      break;

    case "sponsoredSeats": {
      const seats = donation.sponsoredSeats ?? 0;
      const inputVal = parseInt(value || "0");
      if (operator === "eq")  return seats === inputVal;
      if (operator === "neq") return seats !== inputVal;
      if (operator === "gt")  return seats > inputVal;
      if (operator === "gte") return seats >= inputVal;
      if (operator === "lt")  return seats < inputVal;
      if (operator === "lte") return seats <= inputVal;
      break;
    }

    case "seatsUsed": {
      const used = donation.seatsUsed ?? 0;
      const inputVal = parseInt(value || "0");
      if (operator === "eq")  return used === inputVal;
      if (operator === "neq") return used !== inputVal;
      if (operator === "gt")  return used > inputVal;
      if (operator === "gte") return used >= inputVal;
      if (operator === "lt")  return used < inputVal;
      if (operator === "lte") return used <= inputVal;
      break;
    }

    case "hasSeatDiscrepancy": {
      const discrepancy = donation.seatsUsed !== null && donation.sponsoredSeats !== null && donation.seatsUsed < donation.sponsoredSeats;
      return operator === "is_true" ? discrepancy : !discrepancy;
    }

    case "isAnonymous":
      return operator === "is_true" ? donation.isAnonymous : !donation.isAnonymous;

    case "hasNotes":
      return operator === "is_true" ? !!(donation.notes?.trim()) : !(donation.notes?.trim());

    case "noteText": {
      const notes = (donation.notes ?? "").toLowerCase();
      const v = value.toLowerCase();
      if (operator === "is")           return notes === v;
      if (operator === "is_not")       return notes !== v;
      if (operator === "contains")     return notes.includes(v);
      if (operator === "not_contains") return !notes.includes(v);
      if (operator === "is_empty")     return !notes.trim();
      if (operator === "is_not_empty") return !!notes.trim();
      break;
    }

    case "person.status":
      if (!donation.person) return false;
      if (operator === "is")        return donation.person.status === value;
      if (operator === "is_not")    return donation.person.status !== value;
      if (operator === "is_any_of") return vals.includes(donation.person.status);
      break;

    case "person.city": {
      const city = str(donation.person?.city).toLowerCase();
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
      const state = str(donation.person?.state).toLowerCase();
      const v = value.toLowerCase();
      if (operator === "is")          return state === v;
      if (operator === "is_not")      return state !== v;
      if (operator === "contains")    return state.includes(v);
      if (operator === "not_contains") return !state.includes(v);
      if (operator === "is_empty")    return !state.trim();
      if (operator === "is_not_empty") return !!state.trim();
      break;
    }

    case "person.zip": {
      const zip = str(donation.person?.zip).toLowerCase();
      const v = value.toLowerCase();
      if (operator === "is")           return zip === v;
      if (operator === "is_not")       return zip !== v;
      if (operator === "contains")     return zip.includes(v);
      if (operator === "not_contains") return !zip.includes(v);
      if (operator === "is_empty")     return !zip.trim();
      if (operator === "is_not_empty") return !!zip.trim();
      break;
    }

    case "person.tags": {
      if (!donation.person) return operator === "has_none" || operator === "has_none_of";
      const tagIds = donation.person.tags.map((t) => t.tag.id);
      if (operator === "has_any_of")  return vals.some((id) => tagIds.includes(id));
      if (operator === "has_all_of")  return vals.every((id) => tagIds.includes(id));
      if (operator === "has_none_of") return !vals.some((id) => tagIds.includes(id));
      if (operator === "has_any")     return tagIds.length > 0;
      if (operator === "has_none")    return tagIds.length === 0;
      break;
    }

    case "person.assignedTo": {
      const assignedId = donation.person?.assignedTo?.id;
      if (operator === "is")           return assignedId === value;
      if (operator === "is_not")       return assignedId !== value;
      if (operator === "is_assigned")  return !!assignedId;
      if (operator === "is_unassigned") return !assignedId;
      break;
    }

    case "person.orgType": {
      if (!donation.person) return operator === "is_empty";
      const types = donation.person.partnerRoles.map((pr) => pr.partner.organizationType?.typeName ?? "");
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

    case "person.hasPhone":
      return operator === "is_true" ? !!donation.person?.phoneNumber : !donation.person?.phoneNumber;

    case "person.contactMethod": {
      const method = (donation.person?.communicationMethod ?? "").toLowerCase();
      const v = value.toLowerCase();
      if (operator === "is")           return method === v;
      if (operator === "is_not")       return method !== v;
      if (operator === "is_empty")     return !method;
      if (operator === "is_not_empty") return !!method;
      break;
    }
  }
  return false;
}

export function evaluateFundraiserNotice(
  donation: EvalDonation,
  conditions: NoticeCondition[],
  logic: "AND" | "OR"
): boolean {
  if (conditions.length === 0) return false;
  const results = conditions.map((c) => evalDonationCondition(donation, c));
  return logic === "AND" ? results.every(Boolean) : results.some(Boolean);
}
