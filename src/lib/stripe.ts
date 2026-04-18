import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-03-25.dahlia",
    });
  }
  return stripeInstance;
}

export async function createCheckoutSession({
  fundraiserId,
  fundraiserTitle,
  amount,
  donorEmail,
  donorName,
  slug,
  tributeType,
  tributeName,
  isAnonymous,
  connectedAccountId,
}: {
  fundraiserId: string;
  fundraiserTitle: string;
  amount: number;
  donorEmail?: string;
  donorName?: string;
  slug: string;
  tributeType?: string;
  tributeName?: string;
  isAnonymous?: boolean;
  connectedAccountId?: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient();
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const metadata: Record<string, string> = {
    fundraiserId,
    donorName: donorName || "",
    isAnonymous: isAnonymous ? "true" : "false",
  };
  if (tributeType) metadata.tributeType = tributeType;
  if (tributeName) metadata.tributeName = tributeName;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `Donation: ${fundraiserTitle}` },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/donate/${slug}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/donate/${slug}/cancel`,
    metadata,
    customer_email: donorEmail || undefined,
  };

  if (connectedAccountId) {
    return stripe.checkout.sessions.create(sessionParams, {
      stripeAccount: connectedAccountId,
    });
  }

  return stripe.checkout.sessions.create(sessionParams);
}

export async function createSubscriptionCheckoutSession({
  fundraiserId,
  fundraiserTitle,
  amount,
  interval,
  donorEmail,
  donorName,
  slug,
  tributeType,
  tributeName,
  isAnonymous,
  stripeProductId,
  connectedAccountId,
}: {
  fundraiserId: string;
  fundraiserTitle: string;
  amount: number;
  interval: "month" | "year";
  donorEmail?: string;
  donorName?: string;
  slug: string;
  tributeType?: string;
  tributeName?: string;
  isAnonymous?: boolean;
  stripeProductId?: string;
  connectedAccountId?: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient();
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const metadata: Record<string, string> = {
    fundraiserId,
    donorName: donorName || "",
    isAnonymous: isAnonymous ? "true" : "false",
    isRecurring: "true",
    recurringInterval: interval,
  };
  if (tributeType) metadata.tributeType = tributeType;
  if (tributeName) metadata.tributeName = tributeName;

  // Create or use existing product
  let productId = stripeProductId;
  if (!productId) {
    const product = await stripe.products.create({
      name: `Recurring Donation: ${fundraiserTitle}`,
      metadata: { fundraiserId },
    });
    productId = product.id;
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product: productId,
          unit_amount: amount,
          recurring: { interval },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/donate/${slug}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/donate/${slug}/cancel`,
    metadata,
    customer_email: donorEmail || undefined,
  };

  if (connectedAccountId) {
    return stripe.checkout.sessions.create(sessionParams, {
      stripeAccount: connectedAccountId,
    });
  }

  return stripe.checkout.sessions.create(sessionParams);
}

export function constructWebhookEvent(
  body: string,
  signature: string,
  secret: string
): Stripe.Event {
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(body, signature, secret);
}
