import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, notFound, badRequest } from "@/lib/api-error";
import {
  createCheckoutSession,
  createSubscriptionCheckoutSession,
} from "@/lib/stripe";

// GET: Public fundraiser info (no auth)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const fundraiser = await prisma.fundraiser.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        description: true,
        goalAmount: true,
        currentAmount: true,
        presetAmounts: true,
        slug: true,
        isActive: true,
        startDate: true,
        endDate: true,
        stripeProductId: true,
        officeId: true,
      },
    });

    if (!fundraiser || !fundraiser.isActive) {
      return notFound("Fundraiser not found or inactive");
    }

    return NextResponse.json(fundraiser);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: Create Stripe Checkout session (no auth)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const {
      amount,
      donorName,
      donorEmail,
      isRecurring,
      recurringInterval,
      tributeType,
      tributeName,
      isAnonymous,
    } = body;

    if (!amount || typeof amount !== "number" || amount < 100) {
      return badRequest("Minimum donation is $1.00");
    }

    const fundraiser = await prisma.fundraiser.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        isActive: true,
        stripeProductId: true,
        officeId: true,
      },
    });

    if (!fundraiser || !fundraiser.isActive) {
      return notFound("Fundraiser not found or inactive");
    }

    // Check for connected Stripe account
    const integration = await prisma.integrationToken.findUnique({
      where: {
        officeId_provider: {
          officeId: fundraiser.officeId,
          provider: "stripe",
        },
      },
      select: { providerAccountId: true },
    });

    const connectedAccountId = integration?.providerAccountId || undefined;

    let session;
    if (isRecurring && recurringInterval) {
      session = await createSubscriptionCheckoutSession({
        fundraiserId: fundraiser.id,
        fundraiserTitle: fundraiser.title,
        amount,
        interval: recurringInterval === "year" ? "year" : "month",
        donorEmail,
        donorName,
        slug,
        tributeType,
        tributeName,
        isAnonymous,
        stripeProductId: fundraiser.stripeProductId || undefined,
        connectedAccountId,
      });

      // Save product ID for reuse if newly created
      if (!fundraiser.stripeProductId && session.subscription) {
        const lineItems = session.line_items?.data;
        if (lineItems?.[0]?.price?.product) {
          await prisma.fundraiser.update({
            where: { id: fundraiser.id },
            data: { stripeProductId: lineItems[0].price.product as string },
          });
        }
      }
    } else {
      session = await createCheckoutSession({
        fundraiserId: fundraiser.id,
        fundraiserTitle: fundraiser.title,
        amount,
        donorEmail,
        donorName,
        slug,
        tributeType,
        tributeName,
        isAnonymous,
        connectedAccountId,
      });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return handleApiError(error);
  }
}
