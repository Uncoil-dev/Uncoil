# First-customer operating kit

## Objective

Close and deliver one paid **Founding Agent Failure Review** for **$1,000 upfront** within 30 days.

The conversion path is deliberately narrow:

```text
50 qualified accounts
→ 100 personalized contacts
→ 5 discovery calls
→ 2 written offers
→ 1 paid review
→ 1 evidence-backed customer result
```

Payment received is the sales milestone. A signup, positive reply, demo, verbal commitment, or sent proposal is not a sale.

## Assets

- [Customer scope](./founding-agent-failure-review-scope.md)
- [Investigation report template](./investigation-report-template.md)
- [Pilot data checklist and retention log](./pilot-data-sanitization-checklist.md)
- [Sales and demo playbook](./sales-playbook.md)
- [Stripe Payment Link setup](./stripe-payment-link-setup.md)
- Prospect and activity tracker: `outputs/first-customer-execution/uncoil-first-customer-crm.xlsx`

## Ownership

| Owner | Responsibility |
| --- | --- |
| Kristoffer | Warm introductions, sending outreach, replies, calls, closing, and payment requests |
| Expert | Account research, personalized first-line drafts, product readiness, scope and report materials, delivery support, and evidence tracking |

## Daily scorecard

Update the tracker every workday before ending the day.

| Metric | Day 10 target | Day 30 target |
| --- | ---: | ---: |
| Qualified accounts | 50 | 50 |
| Initial messages sent | 100 | 100+ |
| Positive replies | 5 | 5+ |
| Completed discovery calls | 3 | 5 |
| Written offers | 1 | 2 |
| Successful $1,000 payments | 0–1 | 1 |
| Reviews delivered | 0 | 1 |

## Operating sequence

### Before outreach

1. Confirm the public fit-call email action works.
2. Create the one-time $1,000 Stripe Payment Link and record it in the private sales workspace—not in source control.
3. Rehearse the seeded failure demo and the close.
4. Confirm that every target has a concrete live-agent signal and a plausible technical owner.

### Before requesting payment

1. Confirm one consequential failure, one workflow, and one owner.
2. Confirm 10–25 sanitized staging traces or a staging reproduction can be supplied.
3. Agree on the evidence boundary, delivery date, success criterion, review window, and deletion date in writing.
4. Disqualify production PII, regulated data, provider keys, arbitrary repositories, and customer code execution.
5. Send the scope and payment link within one hour of a qualified call.

### Before accepting evidence

1. Confirm payment has succeeded.
2. Complete the intake section of the data checklist.
3. Inspect filenames and the customer’s written description before opening supplied content.
4. Reject and request a sanitized replacement if prohibited data is present.

### Before delivery

1. Separate confirmed evidence from inference in the report.
2. Produce one annotated representative trace and five regression cases.
3. Test the proposed fix when the agreed staging environment permits it; otherwise issue an explicit stop or rollback recommendation.
4. Confirm whether one finding changed code, prompt, retrieval, tool handling, data, or release policy.
5. Schedule deletion and record the final deletion confirmation.

## Stop rules

| Signal | Decision |
| --- | --- |
| No positive replies after 100 qualified contacts | Rewrite the ICP and message; do not build product |
| Replies but no calls | Tighten urgency and the call-to-action |
| Calls but no offers | Require a concrete failure and tighten qualification |
| Offers but no payment | Test trust, scope, price, and data boundaries one at a time |
| Paid review but no evidence access | Tighten pre-payment evidence qualification |
| Useful review but no continued product usage | Treat the service as validated and the SaaS workflow as unvalidated |
| Three independent requests for no-integration evaluation | Reconsider Agent Lab; do not build it before this threshold |

## Deferred work

Do not expand Agent Lab, subscription pricing, product analytics, SEO, integrations, schemas, ingestion formats, or execution infrastructure during this experiment. Repeated customer needs belong in the tracker, not the active delivery scope.
