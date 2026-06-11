import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { getOfficeFilter } from "@/lib/office-filter";
import { centsToDollars } from "@/lib/currency";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  const { id } = await params;
  const officeFilter = await getOfficeFilter();

  const person = await prisma.people.findFirst({
    where: { id, ...officeFilter },
    include: {
      personNotes: {
        include: { author: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      relationships: {
        include: {
          targetPerson: { select: { firstName: true, lastName: true } },
          partnerRole: { include: { partner: { select: { organizationName: true } } } },
          relationshipTypes: { include: { relationshipType: true } },
        },
      },
      targetOfRelationships: {
        include: {
          person: { select: { firstName: true, lastName: true } },
          partnerRole: { include: { partner: { select: { organizationName: true } } } },
          relationshipTypes: { include: { relationshipType: true } },
        },
      },
      partnerRoles: {
        include: { partner: { select: { organizationName: true } } },
      },
      connections: {
        include: {
          partnerRole: {
            include: {
              partner: { select: { organizationName: true } },
              person: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { connectionDate: "desc" },
        take: 5,
      },
      happeningResponses: {
        include: { happening: { select: { happeningDescription: true, happeningDate: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      donations: {
        include: { fundraiser: { select: { title: true } } },
        orderBy: { donatedAt: "desc" },
      },
      solicitations: {
        include: { fundraiser: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      assignedTo: { select: { firstName: true, lastName: true } },
    },
  });

  if (!person) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const donationTotal = centsToDollars(person.donations.reduce((sum, d) => sum + d.amount, 0));

  const lines: string[] = [
    `Person: ${person.prefix ? person.prefix + " " : ""}${person.firstName} ${person.lastName}`,
    `Status: ${person.status}`,
    person.isConnector ? "Role in network: Connector" : "",
    person.assignedTo
      ? `Assigned fundraiser: ${person.assignedTo.firstName} ${person.assignedTo.lastName}`
      : "",
    person.city && person.state ? `Location: ${person.city}, ${person.state}` : "",
    "",
    "Organizational roles:",
    person.partnerRoles.length > 0
      ? person.partnerRoles
          .map((pr) => `  - ${pr.partner.organizationName}: ${pr.roleDescription}`)
          .join("\n")
      : "  None recorded",
    "",
    "Relationships (they connect to others in the network):",
    person.relationships.length > 0
      ? person.relationships
          .map(
            (r) =>
              `  - ${r.targetPerson.firstName} ${r.targetPerson.lastName}${r.partnerRole ? ` at ${r.partnerRole.partner.organizationName}` : ""} (${r.relationshipTypes.map((rt) => rt.relationshipType.relationshipDesc).join(", ")})`
          )
          .join("\n")
      : "  None",
    "",
    "Relationships (others who have a connection to them):",
    person.targetOfRelationships.length > 0
      ? person.targetOfRelationships
          .map(
            (r) =>
              `  - ${r.person.firstName} ${r.person.lastName}${r.partnerRole ? ` at ${r.partnerRole.partner.organizationName}` : ""} (${r.relationshipTypes.map((rt) => rt.relationshipType.relationshipDesc).join(", ")})`
          )
          .join("\n")
      : "  None",
    "",
    "Recent interactions / connections:",
    person.connections.length > 0
      ? person.connections
          .map(
            (c) =>
              `  - ${new Date(c.connectionDate).toLocaleDateString()}: via ${c.partnerRole.person ? `${c.partnerRole.person.firstName} ${c.partnerRole.person.lastName}` : "unknown"} at ${c.partnerRole.partner.organizationName}${c.notes ? ` — "${c.notes}"` : ""}`
          )
          .join("\n")
      : "  None recorded",
    "",
    "Fundraising solicitations:",
    person.solicitations.length > 0
      ? person.solicitations
          .map((s) => `  - ${s.fundraiser.title}: ${s.status}`)
          .join("\n")
      : "  None",
    "",
    "Giving history:",
    person.donations.length > 0
      ? `  Total given: $${donationTotal.toFixed(2)}\n  Donations: ${person.donations.map((d) => `$${centsToDollars(d.amount).toFixed(2)} to "${d.fundraiser.title}" on ${new Date(d.donatedAt).toLocaleDateString()}`).join("; ")}`
      : "  No donations recorded",
    "",
    "Public statements / happenings:",
    person.happeningResponses.length > 0
      ? person.happeningResponses
          .map(
            (hr) =>
              `  - ${new Date(hr.happening.happeningDate).toLocaleDateString()}: ${hr.happening.happeningDescription}${hr.responseNotes ? ` — "${hr.responseNotes}"` : ""}${hr.isPublic ? " [public statement]" : ""}`
          )
          .join("\n")
      : "  None recorded",
    "",
    "Notes (most recent first):",
    person.personNotes.length > 0
      ? person.personNotes
          .map(
            (n) =>
              `  [${new Date(n.createdAt).toLocaleDateString()}${n.author ? ` — ${n.author.firstName} ${n.author.lastName}` : ""}]\n  ${n.content}`
          )
          .join("\n\n")
      : "  No notes recorded",
  ];

  const context = lines.filter((l) => l !== null).join("\n");

  const prompt = `You are a briefing assistant for a nonprofit fundraising team. A fundraiser is about to reach out to or meet with the person below. Based on the CRM data provided, write a concise briefing covering:

1. Who this person is and their connection to the organization
2. The history of engagement with them (interactions, notes, any donations)
3. Where they currently stand in any fundraising pipeline
4. Key people in their network that matter for this relationship
5. Two or three specific talking points or things to keep in mind going into the conversation

Write in direct, plain language. Use short paragraphs rather than bullet lists where possible. If there is very little data, say so honestly and focus on what is known.

---

${context}`;

  const stream = await anthropic.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text));
        }
      }
      controller.close();
    },
    cancel() {
      stream.controller.abort();
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
