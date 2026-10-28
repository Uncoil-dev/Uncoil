# One-time $1,000 Stripe Payment Link

No payment code or SaaS subscription change is required for the founding review. Create a separate no-code, one-time Payment Link in the Stripe Dashboard.

## Required product configuration

| Field | Value |
| --- | --- |
| Name | Founding Agent Failure Review |
| Price | $1,000.00 USD |
| Billing type | One time |
| Quantity | Fixed at 1 |
| Description | One agent workflow, one failure scenario, five-business-day review using sanitized staging evidence |
| Capacity | First three customers; pause the link after three successful payments |

## Dashboard procedure

1. In the intended Stripe account and mode, create a product named **Founding Agent Failure Review**.
2. Add a **one-time $1,000 USD** price. Do not attach it to the existing $19/$39 subscriptions.
3. Create a Payment Link for that price with quantity fixed at one.
4. Require the buyer’s name and email. Collect billing address only if accounting or tax requirements need it.
5. Add a custom field for **Company name** if the sales record needs it.
6. Set the post-payment message to: “Payment received. Reply to the scope email with the confirmed technical owner. Do not send traces until Uncoil confirms the sanitized staging evidence channel and deletion date.”
7. Keep payment methods managed by Stripe rather than hard-coding method types.
8. Do not enable automatic tax unless the Stripe account has an active, verified registration for the relevant jurisdiction.
9. Complete a test-mode payment and verify the receipt, buyer email, amount, currency, and success message.
10. Create the live link only after the test passes. Store the live URL in the private CRM or password manager, not in source control.

## Sales handling

- Send the customer scope and Payment Link within one hour of a qualified call.
- Confirm successful payment in Stripe before accepting pilot evidence.
- Issue an invoice only when the buyer requests one.
- Pause the link after the third successful founding-review payment.
- Use Stripe’s normal refund flow if the agreed evidence produces no evidence-backed finding.

## Current implementation status

The repository does not have a Stripe CLI login or `STRIPE_SECRET_KEY` available in this worktree, so no external Stripe product or Payment Link was created during this implementation. This avoids guessing the Stripe account, operating mode, tax configuration, or credentials. The Dashboard steps above are the remaining owner action.
