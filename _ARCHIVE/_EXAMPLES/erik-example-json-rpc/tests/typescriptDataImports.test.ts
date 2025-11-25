import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";

/**
 * Test TypeScript data file imports
 */
import { peopleCategory } from "../src/userContext/people/category";
import { peopleRecords } from "../src/userContext/people/records";

describe("TypeScript data imports", () => {
  it("should load people category from TypeScript module", () => {
    expect(peopleCategory.id).toBe("people");
    expect(peopleCategory.name).toBe("People");
    expect(peopleCategory.description).toContain("Employee directory");
    expect(peopleCategory.aliases).toContain("employees");
    expect(peopleCategory.config.purpose).toContain("Surface who can help");
  });

  it("should load people records from TypeScript module", () => {
    expect(peopleRecords.length).toBeGreaterThan(0);
    expect(peopleRecords[0].id).toBe("person-001");
    expect(peopleRecords[0].name).toBe("Elliot Harper");
    expect(peopleRecords[0].skills).toContain("python");
    expect(peopleRecords[0].departmentId).toBe("dept-analytics");
  });

  it("should provide compile-time type safety", () => {
    // These would be TypeScript compile errors if types were wrong
    const category = peopleCategory;
    const firstPerson = peopleRecords[0];

    expect(typeof category.id).toBe("string");
    expect(Array.isArray(category.aliases)).toBe(true);
    expect(typeof firstPerson.name).toBe("string");
    expect(Array.isArray(firstPerson.skills)).toBe(true);
  });
});
