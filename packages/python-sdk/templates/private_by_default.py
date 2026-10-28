import re
import uncoil

# Record about one run in ten, hide personal details, and add your own rules.
client = uncoil.UncoilClient(
    sample_rate=0.1,
    redact={
        # "pii": False,                               # emails, phone numbers and card numbers are masked by default; uncomment to turn off
        "patterns": [re.compile(r"ACME-\d{6}")],      # anything else you consider private
    },
    # Print problems your own way instead of to the console:
    on_error=lambda error: print(f"[uncoil] {error}"),
)
