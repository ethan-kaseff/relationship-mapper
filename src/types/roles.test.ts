import { describe, it, expect } from "vitest";
import { ROLES, hasMinimumRole, isAdmin, isSystemAdmin } from "./roles";

describe("Role Utilities", () => {
  describe("ROLES constant", () => {
    it("should have all expected roles", () => {
      expect(ROLES.SYSTEM_ADMIN).toBe("SYSTEM_ADMIN");
      expect(ROLES.OFFICE_ADMIN).toBe("OFFICE_ADMIN");
      expect(ROLES.OFFICE_USER).toBe("OFFICE_USER");
      expect(ROLES.CONNECTOR).toBe("CONNECTOR");
    });
  });

  describe("hasMinimumRole", () => {
    it("should return true when user has exact required role", () => {
      expect(hasMinimumRole("SYSTEM_ADMIN", "SYSTEM_ADMIN")).toBe(true);
      expect(hasMinimumRole("OFFICE_ADMIN", "OFFICE_ADMIN")).toBe(true);
      expect(hasMinimumRole("CONNECTOR", "CONNECTOR")).toBe(true);
    });

    it("should return true when user has higher role", () => {
      expect(hasMinimumRole("SYSTEM_ADMIN", "OFFICE_ADMIN")).toBe(true);
      expect(hasMinimumRole("SYSTEM_ADMIN", "OFFICE_USER")).toBe(true);
      expect(hasMinimumRole("SYSTEM_ADMIN", "CONNECTOR")).toBe(true);
      expect(hasMinimumRole("OFFICE_ADMIN", "OFFICE_USER")).toBe(true);
      expect(hasMinimumRole("OFFICE_ADMIN", "CONNECTOR")).toBe(true);
      expect(hasMinimumRole("OFFICE_USER", "CONNECTOR")).toBe(true);
    });

    it("should return false when user has lower role", () => {
      expect(hasMinimumRole("CONNECTOR", "SYSTEM_ADMIN")).toBe(false);
      expect(hasMinimumRole("CONNECTOR", "OFFICE_ADMIN")).toBe(false);
      expect(hasMinimumRole("CONNECTOR", "OFFICE_USER")).toBe(false);
      expect(hasMinimumRole("OFFICE_USER", "OFFICE_ADMIN")).toBe(false);
      expect(hasMinimumRole("OFFICE_USER", "SYSTEM_ADMIN")).toBe(false);
      expect(hasMinimumRole("OFFICE_ADMIN", "SYSTEM_ADMIN")).toBe(false);
    });

    it("should return false for undefined role", () => {
      expect(hasMinimumRole(undefined, "CONNECTOR")).toBe(false);
    });

    it("should return false for invalid role", () => {
      expect(hasMinimumRole("INVALID_ROLE", "CONNECTOR")).toBe(false);
    });
  });

  describe("isAdmin", () => {
    it("should return true for SYSTEM_ADMIN", () => {
      expect(isAdmin("SYSTEM_ADMIN")).toBe(true);
    });

    it("should return true for OFFICE_ADMIN", () => {
      expect(isAdmin("OFFICE_ADMIN")).toBe(true);
    });

    it("should return false for non-admin roles", () => {
      expect(isAdmin("OFFICE_USER")).toBe(false);
      expect(isAdmin("CONNECTOR")).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isAdmin(undefined)).toBe(false);
    });
  });

  describe("isSystemAdmin", () => {
    it("should return true only for SYSTEM_ADMIN", () => {
      expect(isSystemAdmin("SYSTEM_ADMIN")).toBe(true);
    });

    it("should return false for other roles", () => {
      expect(isSystemAdmin("OFFICE_ADMIN")).toBe(false);
      expect(isSystemAdmin("OFFICE_USER")).toBe(false);
      expect(isSystemAdmin("CONNECTOR")).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isSystemAdmin(undefined)).toBe(false);
    });
  });
});
