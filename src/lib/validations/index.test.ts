import { describe, it, expect } from "vitest";
import {
  createPartnerSchema,
  createPeopleSchema,
  createConnectionSchema,
  createEventSchema,
  createUserSchema,
} from "./index";

describe("Validation Schemas", () => {
  describe("createPartnerSchema", () => {
    it("should validate a valid organization partner", () => {
      const data = {
        orgPeopleFlag: "O",
        organizationName: "Test Organization",
        city: "Kansas City",
        state: "MO",
      };

      const result = createPartnerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should validate a valid individual partner", () => {
      const data = {
        orgPeopleFlag: "P",
        organizationName: "John Doe",
        email: "john@example.com",
      };

      const result = createPartnerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject invalid orgPeopleFlag", () => {
      const data = {
        orgPeopleFlag: "X",
        organizationName: "Test",
      };

      const result = createPartnerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject missing organizationName", () => {
      const data = {
        orgPeopleFlag: "O",
      };

      const result = createPartnerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject invalid email format", () => {
      const data = {
        orgPeopleFlag: "O",
        organizationName: "Test",
        email: "not-an-email",
      };

      const result = createPartnerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("createPeopleSchema", () => {
    it("should validate a valid person", () => {
      const data = {
        firstName: "Jane",
        lastName: "Doe",
        city: "Kansas City",
        state: "MO",
        isConnector: true,
      };

      const result = createPeopleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject missing fullName", () => {
      const data = {
        city: "Kansas City",
      };

      const result = createPeopleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should default isConnector to false", () => {
      const data = {
        firstName: "Jane",
        lastName: "Doe",
      };

      const result = createPeopleSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isConnector).toBe(false);
      }
    });
  });

  describe("createConnectionSchema", () => {
    it("should validate a valid connection", () => {
      const data = {
        peopleId: "550e8400-e29b-41d4-a716-446655440000",
        partnerRoleId: "550e8400-e29b-41d4-a716-446655440001",
        connectionDate: "2025-01-15",
        notes: "Met at community event",
      };

      const result = createConnectionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID", () => {
      const data = {
        peopleId: "not-a-uuid",
        partnerRoleId: "550e8400-e29b-41d4-a716-446655440001",
        connectionDate: "2025-01-15",
      };

      const result = createConnectionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject invalid date format", () => {
      const data = {
        peopleId: "550e8400-e29b-41d4-a716-446655440000",
        partnerRoleId: "550e8400-e29b-41d4-a716-446655440001",
        connectionDate: "not-a-date",
      };

      const result = createConnectionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("createEventSchema", () => {
    it("should validate a valid event", () => {
      const data = {
        eventDate: "2025-01-15",
        eventDescription: "Community Safety Meeting",
      };

      const result = createEventSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject missing eventDescription", () => {
      const data = {
        eventDate: "2025-01-15",
      };

      const result = createEventSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("createUserSchema", () => {
    it("should validate a valid user", () => {
      const data = {
        email: "user@example.com",
        password: "securepassword123",
        firstName: "Test",
        lastName: "User",
        role: "OFFICE_ADMIN",
        officeId: "550e8400-e29b-41d4-a716-446655440000",
      };

      const result = createUserSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject short password", () => {
      const data = {
        email: "user@example.com",
        password: "short",
        firstName: "Test",
        lastName: "User",
        officeId: "550e8400-e29b-41d4-a716-446655440000",
      };

      const result = createUserSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject invalid email", () => {
      const data = {
        email: "not-an-email",
        password: "securepassword123",
        firstName: "Test",
        lastName: "User",
        officeId: "550e8400-e29b-41d4-a716-446655440000",
      };

      const result = createUserSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject invalid role", () => {
      const data = {
        email: "user@example.com",
        password: "securepassword123",
        firstName: "Test",
        lastName: "User",
        role: "INVALID_ROLE",
        officeId: "550e8400-e29b-41d4-a716-446655440000",
      };

      const result = createUserSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
