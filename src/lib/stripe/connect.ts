import { stripe } from "./client"

/**
 * Creates a Stripe Express connected account for a creator.
 * Requests card_payments and transfers capabilities.
 * Returns the new account ID.
 */
export async function createExpressAccount(
  email: string,
  country?: string
): Promise<string> {
  const account = await stripe.accounts.create({
    type: "express",
    email,
    country: country ?? undefined,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  })

  return account.id
}

/**
 * Creates a single-use Account Link for Connect onboarding.
 * Account Links expire quickly, so always generate fresh ones.
 * Returns the onboarding URL.
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<string> {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  })

  return accountLink.url
}
