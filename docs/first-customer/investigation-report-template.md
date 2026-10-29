# Agent Failure Review — investigation report

| Review field | Value |
| --- | --- |
| Customer | **[Customer name]** |
| Workflow | **[One workflow]** |
| Failure scenario | **[One observable failure]** |
| Review period | **[Start]–[Delivery]** |
| Technical owner | **[Name and role]** |
| Evidence deletion date | **[Date]** |

## Executive decision

**Observed failure:** [What the agent did incorrectly.]

**Consequence:** [Customer, engineering, cost, or release impact.]

**Evidence-backed finding:** [The narrow mechanism supported by the supplied evidence.]

**Recommended decision:** [Ship tested fix / stop / rollback / collect specified missing evidence.]

**Changed decision:** [Code, prompt, retrieval, tool handling, data, or release policy changed as a result.]

## Scope and limitations

- One workflow: [name]
- One failure: [scenario]
- Evidence accepted: [file or trace inventory]
- Staging conditions: [environment, release, model, relevant configuration]
- Explicitly excluded: [production data, additional workflows, inaccessible systems]
- Confidence limit: [what the evidence cannot establish]

## Representative trace

- Trace ID: **[ID]**
- Observed at: **[timestamp and timezone]**
- Expected outcome: **[expected behavior]**
- Observed outcome: **[actual behavior]**

| Step | Span or event | Confirmed observation | Why it matters | Annotation |
| ---: | --- | --- | --- | --- |
| 1 | [event] | [telemetry-supported fact] | [impact] | [reference] |
| 2 | [event] | [telemetry-supported fact] | [impact] | [reference] |
| 3 | [event] | [telemetry-supported fact] | [impact] | [reference] |

Attach or link the annotated trace image/export here: **[artifact]**.

## Evidence board

### Confirmed evidence

| Evidence ID | Observation | Source | Reproduced? |
| --- | --- | --- | --- |
| E-01 | [fact, not interpretation] | [trace/span/file] | [yes/no] |
| E-02 | [fact, not interpretation] | [trace/span/file] | [yes/no] |

### Inferences and alternatives

| Hypothesis | Supporting evidence | Contradicting or missing evidence | Status |
| --- | --- | --- | --- |
| H-01 | [evidence IDs] | [gap or alternative] | [supported/rejected/open] |

## Failure mechanism

**Mechanism:** [The shortest causal explanation the evidence supports.]

```text
[trigger]
→ [agent or system behavior]
→ [unhandled or incorrect state]
→ [customer-visible failure]
```

Do not label correlation, timing, or a plausible narrative as confirmed causation without a supporting comparison or reproduction.

## Tested fix or stop recommendation

### Change tested

[Exact change to prompt, code, retrieval, tool handling, data, or release policy.]

### Test conditions

[Staging release, fixed inputs, model/settings, number of runs, and comparison baseline.]

### Result

| Measure | Before | After | Interpretation |
| --- | ---: | ---: | --- |
| Target failure reproduced | [x/y] | [x/y] | [result] |
| Regression cases passed | [x/5] | [x/5] | [result] |
| Relevant cost/latency | [value] | [value] | [result] |

If no fix can be tested inside the agreed boundary, replace this section with an explicit stop/rollback recommendation and the evidence needed to lift it.

## Regression cases

| ID | Scenario | Fixed input or setup | Expected result | Failure signal |
| --- | --- | --- | --- | --- |
| R-01 | Original failure | [input] | [expected] | [observable] |
| R-02 | Nearest healthy case | [input] | [expected] | [observable] |
| R-03 | Boundary condition | [input] | [expected] | [observable] |
| R-04 | Tool/retrieval degradation | [input] | [expected] | [observable] |
| R-05 | Release-policy guard | [input] | [expected] | [observable] |

## Readout decisions

- [ ] Finding is new and credible to the customer.
- [ ] Finding changed an engineering or release decision.
- [ ] Customer identified the next owner and due date.
- [ ] Customer would send future traces to Uncoil.
- [ ] Permission to publish an anonymized case study was requested.
- [ ] Continued paid use was discussed only after value was confirmed.

## Follow-up and deletion

| Action | Owner | Due date | Status |
| --- | --- | --- | --- |
| [action] | [owner] | [date] | [open/done] |
| Delete supplied pilot evidence | Uncoil | [date] | [open/done] |
| Send deletion confirmation | Uncoil | [date] | [open/done] |
