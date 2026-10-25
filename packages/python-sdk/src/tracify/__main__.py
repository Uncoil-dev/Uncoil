import sys

from .doctor import main

# `python -m tracify` and `python -m tracify doctor` both run the setup checker.
sys.exit(main(sys.argv[2:] if sys.argv[1:2] == ["doctor"] else sys.argv[1:]))
