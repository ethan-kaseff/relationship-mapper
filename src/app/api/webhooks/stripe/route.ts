import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { constructWebhookEvent } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = constructWebhookEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        await handleRecurringPayment(invoice);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCheckoutCompleted(session: any) {
  const metadata = session.metadata || {};
  const fundraiserId = metadata.fundraiserId;
  if (!fundraiserId) return;

  const paymentId = session.payment_intent || session.subscription || session.id;

  // Idempotency: check if donation already exists
  const existing = await prisma.donation.findUnique({
    where: { stripePaymentId: paymentId },
  });
  if (existing) return;

  const amount = session.amount_total || 0;
  const donorEmail = session.customer_email || session.customer_details?.email;
  const donorName = metadata.donorName || session.customer_details?.name;
  const isAnonymous = metadata.isAnonymous === "true";
  const isRecurring = metadata.isRecurring === "true";
  const recurringInterval = metadata.recurringInterval;
  const tributeType = metadata.tributeType || null;
  const tributeName = metadata.tributeName || null;

  // Try to match donor to existing person by email
  let peopleId: string | null = null;
  if (donorEmail) {
    const fundraiser = await prisma.fundraiser.findUnique({
      where: { id: fundraiserId },
      select: { officeId: true },
    });
    if (fundraiser) {
      const person = await prisma.people.findFirst({
        where: {
          officeId: fundraiser.officeId,
          OR: [
            { email1: { equals: donorEmail, mode: "insensitive" } },
            { email2: { equals: donorEmail, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      if (person) peopleId = person.id;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.donation.create({
      data: {
        fundraiserId,
        amount,
        donorName,
        donorEmail,
        peopleId,
        isAnonymous,
        paymentMethod: "stripe",
        stripePaymentId: paymentId,
        stripeSubId: isRecurring ? (session.subscription as string) : null,
        isRecurring,
        recurringInterval,
        tributeType,
        tributeName,
        approvalStatus: peopleId ? "AUTO_APPROVED" : "PENDING",
        donatedAt: new Date(),
      },
    });

    await tx.fundraiser.update({
      where: { id: fundraiserId },
      data: { currentAmount: { increment: amount } },
    });
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleRecurringPayment(invoice: any) {
  // Only process paid invoices that aren't the first (first handled by checkout.session.completed)
  if (invoice.billing_reason === "subscription_create") return;
  if (invoice.status !== "paid") return;

  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  // Find the original donation to get metadata
  const originalDonation = await prisma.donation.findFirst({
    where: { stripeSubId: subscriptionId },
    select: {
      fundraiserId: true,
      donorName: true,
      donorEmail: true,
      peopleId: true,
      isAnonymous: true,
      tributeType: true,
      tributeName: true,
      recurringInterval: true,
    },
  });
  if (!originalDonation) return;

  const paymentId = invoice.payment_intent || invoice.id;

  // Idempotency check
  const existing = await prisma.donation.findUnique({
    where: { stripePaymentId: paymentId },
  });
  if (existing) return;

  const amount = invoice.amount_paid || 0;

  await prisma.$transaction(async (tx) => {
    await tx.donation.create({
      data: {
        fundraiserId: originalDonation.fundraiserId,
        amount,
        donorName: originalDonation.donorName,
        donorEmail: originalDonation.donorEmail,
        peopleId: originalDonation.peopleId,
        isAnonymous: originalDonation.isAnonymous,
        paymentMethod: "stripe",
        stripePaymentId: paymentId,
        stripeSubId: subscriptionId,
        isRecurring: true,
        recurringInterval: originalDonation.recurringInterval,
        tributeType: originalDonation.tributeType,
        tributeName: originalDonation.tributeName,
        approvalStatus: originalDonation.peopleId ? "AUTO_APPROVED" : "PENDING",
        donatedAt: new Date(),
      },
    });

    await tx.fundraiser.update({
      where: { id: originalDonation.fundraiserId },
      data: { currentAmount: { increment: amount } },
    });
  });
}
