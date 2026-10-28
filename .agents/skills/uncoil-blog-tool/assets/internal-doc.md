# Trace retention operations

## Purpose

Explain how operators verify and change trace-retention behavior without exposing customer payloads or deleting data unintentionally.

## Audience

Uncoil engineers responsible for production data lifecycle and incident response.

## Prerequisites

- Access to the target environment.
- The project identifier and approved retention policy.
- A recovery plan for any destructive change.

## Procedure

1. Confirm the target environment and project.
2. Inspect the current retention setting with a read-only command.
3. Compare the requested change with the approved policy.
4. Apply the smallest scoped change.
5. Verify the resulting setting and record the evidence.

## Expected result

The target project reports the approved retention period, and unrelated projects remain unchanged.

## Troubleshooting

If verification differs from the requested value, stop. Preserve command output, confirm environment selection, and investigate before retrying.

## Related references

- [Architecture](../architecture.md)
- [Project conventions](../conventions.md)
