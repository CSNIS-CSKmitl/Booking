import { describe, it, expect, vi } from "vitest";
import { resolveBookingRecipients, escapeHtml, sanitizeHeader } from "./notification";

describe("HTML and Header Security Sanitization", () => {
  it("escapes special HTML characters to prevent XSS / markup injection", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
    );
    expect(escapeHtml('Room "A" & "B"')).toBe(
      "Room &quot;A&quot; &amp; &quot;B&quot;"
    );
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("sanitizes subject headers by stripping newlines (prevent CRLF injection)", () => {
    expect(sanitizeHeader("Room Lab1\r\nBcc: hacker@test.com")).toBe(
      "Room Lab1 Bcc: hacker@test.com"
    );
    expect(sanitizeHeader(null)).toBe("");
  });
});

describe("resolveBookingRecipients", () => {
  function createMockPb(users: any[]) {
    return {
      collection: vi.fn().mockReturnValue({
        getFullList: vi.fn().mockResolvedValue(users),
      }),
    } as any;
  }

  const sampleUsers = [
    { id: "1", email: "head@cs.kmitl.ac.th", roles: ["head"] },
    { id: "2", email: "superadmin@cs.kmitl.ac.th", roles: ["super_admin"] },
    { id: "3", email: "teacher1@cs.kmitl.ac.th", roles: ["teachers"] },
    { id: "4", email: "staff1@cs.kmitl.ac.th", roles: ["staff"] },
    { id: "5", email: "student1@cs.kmitl.ac.th", roles: ["students"] },
  ];

  it("Student books: sends to head + super_admin + advisorEmail, excluding student themselves", async () => {
    const pb = createMockPb(sampleUsers);
    const studentBooker = {
      email: "student1@cs.kmitl.ac.th",
      roles: ["students"],
    };
    const advisorEmail = "teacher1@cs.kmitl.ac.th";

    const recipients = await resolveBookingRecipients(
      pb,
      studentBooker,
      advisorEmail,
    );

    expect(recipients).toContain("head@cs.kmitl.ac.th");
    expect(recipients).toContain("superadmin@cs.kmitl.ac.th");
    expect(recipients).toContain("teacher1@cs.kmitl.ac.th");
    expect(recipients).not.toContain("student1@cs.kmitl.ac.th");
    expect(recipients.length).toBe(3);
  });

  it("Super Admin books: sends to head, excluding super_admin themselves", async () => {
    const pb = createMockPb(sampleUsers);
    const superAdminBooker = {
      email: "superadmin@cs.kmitl.ac.th",
      roles: ["super_admin"],
    };

    const recipients = await resolveBookingRecipients(pb, superAdminBooker);

    expect(recipients).toContain("head@cs.kmitl.ac.th");
    expect(recipients).not.toContain("superadmin@cs.kmitl.ac.th");
    expect(recipients.length).toBe(1);
  });

  it("Staff or Teacher books: sends to super_admin + head, excluding themselves", async () => {
    const pb = createMockPb(sampleUsers);
    const teacherBooker = {
      email: "teacher1@cs.kmitl.ac.th",
      roles: ["teacher"],
    };

    const recipients = await resolveBookingRecipients(pb, teacherBooker);

    expect(recipients).toContain("superadmin@cs.kmitl.ac.th");
    expect(recipients).toContain("head@cs.kmitl.ac.th");
    expect(recipients).not.toContain("teacher1@cs.kmitl.ac.th");
    expect(recipients.length).toBe(2);
  });

  it("Head books: sends to super_admin, excluding head themselves", async () => {
    const pb = createMockPb(sampleUsers);
    const headBooker = { email: "head@cs.kmitl.ac.th", roles: ["head"] };

    const recipients = await resolveBookingRecipients(pb, headBooker);

    expect(recipients).toContain("superadmin@cs.kmitl.ac.th");
    expect(recipients).not.toContain("head@cs.kmitl.ac.th");
    expect(recipients.length).toBe(1);
  });

  it("Deduplicates if user has multiple roles", async () => {
    const usersWithOverlap = [
      {
        id: "1",
        email: "head-and-admin@cs.kmitl.ac.th",
        roles: ["head", "super_admin"],
      },
    ];
    const pb = createMockPb(usersWithOverlap);
    const studentBooker = {
      email: "student@cs.kmitl.ac.th",
      roles: ["student"],
    };

    const recipients = await resolveBookingRecipients(pb, studentBooker);

    expect(recipients).toEqual(["head-and-admin@cs.kmitl.ac.th"]);
  });
});
