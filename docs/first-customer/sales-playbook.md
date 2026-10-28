# Founding review sales and demo playbook

## Qualification gate

Proceed only when the prospect has:

- A customer-facing RAG or tool-calling agent with live users.
- One recent consequential wrong answer, retrieval failure, tool failure, unexpected cost, or regression.
- A technical owner who can supply 10–25 sanitized staging traces or a staging reproduction.
- Authority to approve $1,000 without enterprise procurement.
- No regulated-data requirement for this review.

Disqualify no-live-user experiments, vague reliability interest, missing technical ownership, enterprise procurement, regulated production data, and teams unwilling to share sanitized evidence.

## Initial outreach

**Subject:** A question about failures in [product]

> Hi [name], I saw that [specific evidence about their customer-facing agent]. When these systems fail, the difficult part is usually proving whether the cause was retrieval, a tool result, model behavior, or a release change.
>
> I’m offering three founding Agent Failure Reviews through Uncoil: one real staging failure, five business days, an annotated trace, the evidence-backed mechanism, and five regression cases. The fixed price is $1,000, with a refund if I cannot produce an evidence-backed finding from the agreed data.
>
> Has your team had a failure recently that was difficult to reproduce or prevent?

Personalize the first sentence with a verifiable launch, customer story, job post, technical article, product page, or demo. Do not invent the framework or imply an incident without public evidence.

## Follow-up cadence

### Day 3

> Hi [name] — following up because [specific agent/use case] looks like the kind of workflow where a single retrieval or tool-handling edge case can be expensive to diagnose. If there is one recent failure your team still does not fully trust, I can tell you in 20 minutes whether the review fits and what sanitized staging evidence it would require.

### Day 7

> Last note from me, [name]. The founding review is deliberately narrow: one workflow, one failure, $1,000, and five business days. If there is no concrete failure now, no action needed. If there is, reply with the symptom and stack and I’ll confirm fit.

Stop after the second follow-up unless the prospect engages.

## Twenty-minute fit call

The call qualifies the investigation; it does not deliver the investigation.

### Minute 0–3: consequence

1. What did the agent do incorrectly?
2. Who noticed, and what customer or engineering consequence followed?
3. What happens if it recurs?

### Minute 3–10: evidence

4. Can the failure be reproduced in staging?
5. What traces, logs, inputs, tool results, retrieval results, prompts, and release metadata exist?
6. Why were current logs or observability tools insufficient?
7. Is there a healthy comparison?

### Minute 10–16: ownership and boundary

8. Who owns the fix and the purchase?
9. Can the team supply 10–25 sanitized staging traces or a staging reproduction?
10. Can they exclude production PII, secrets, regulated data, provider keys, repositories, and executable code?

### Minute 16–20: value and close

11. Is resolving this failure worth $1,000 now?
12. What change would make the review count as successful?

Do not provide a root-cause map, written findings, regression cases, or a release recommendation during this call.

## Direct close

> This fits the Founding Agent Failure Review. I will investigate this one failure over five business days for $1,000 paid upfront. You will receive the annotated evidence, the likely mechanism, and five regression cases. If I cannot produce one evidence-backed finding from the agreed data, I will refund the fee. Shall I send the one-page scope and payment link today?

Send the scope and payment link within one hour. Provide an invoice only when requested. Do not accept evidence before successful payment and written scope confirmation.

## Seeded demo script

Keep the walkthrough under seven minutes.

1. **Set the frame:** “This is seeded support-agent data, not a live customer account.”
2. **Show the symptom:** Open the failed refund lookup and identify the observable wrong behavior.
3. **Reconstruct the run:** Point out model, retrieval/tool sequence, cost, latency, and release context. Describe observations before hypotheses.
4. **Compare evidence:** Show how a healthy run or prior release narrows the mechanism.
5. **Connect to a decision:** Explain the tested change and the five regression cases that guard the release.
6. **State the boundary:** One failure, sanitized staging evidence, five business days; no production-data access or broad implementation.
7. **Ask:** “Do you have one recent failure that was difficult to reproduce or prevent?”

Never imply that seeded metrics, traces, evaluations, or deployment actions came from a real customer.

## Objection log

Tag every objection with one primary category so patterns can be counted.

| Category | Diagnostic question | Response principle |
| --- | --- | --- |
| Pain | “What happens if this failure recurs?” | Disqualify if the consequence is immaterial |
| Urgency | “Why resolve it this month?” | Do not manufacture urgency |
| Trust | “What proof would make this engagement credible?” | Narrow scope, evidence boundary, and refund condition |
| Data sharing | “Can staging traces be sanitized while preserving the failure?” | Reject production or regulated data; offer a staging reproduction |
| Price | “Is the issue the amount, or confidence in the result?” | Change one variable at a time; do not discount reflexively |
| Timing | “What event would make this a priority?” | Set a concrete follow-up trigger or close the loop |
| Existing-tool satisfaction | “What did the current tool fail to prove?” | Disqualify if the existing workflow already resolves the problem |

## Post-delivery interview

Ask only after delivering the readout:

1. Was the finding new and credible?
2. Did it change an engineering or release decision?
3. Would the team keep sending traces to Uncoil?
4. What would they pay monthly?
5. Which product or evidence step was hardest?
6. May Uncoil publish an anonymized case study?

Request continued paid use only after the customer confirms value. Do not promise a future $299–$499 plan in advance.
