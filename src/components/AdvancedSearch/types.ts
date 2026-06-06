export type FilterConnector = "AND" | "OR";

export type FilterCategory =
  | "status"
  | "tags"
  | "notes"
  | "events"
  | "fundraisers"
  | "giving"
  | "date_added";

export interface FilterRow {
  id: string;
  category: FilterCategory;
  operator: string;
  value: Record<string, unknown>;
  connector: FilterConnector;
}

export interface AdvancedSearchPerson {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  city: string | null;
  state: string | null;
  email1: string | null;
  email2: string | null;
  phoneNumber: string | null;
  tags: { tag: { id: string; name: string } }[];
}

export interface RefData {
  tags: { id: string; name: string }[];
  events: { id: string; title: string; eventDate: string | null }[];
  fundraisers: { id: string; title: string; event: { id: string } | null }[];
  users: { id: string; firstName: string; lastName: string }[];
}
