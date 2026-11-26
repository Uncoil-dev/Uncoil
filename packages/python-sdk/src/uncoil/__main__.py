import sys
from typing import List, Optional

from . import doctor


def main(argv: Optional[List[str]] = None) -> int:
    """`uncoil doctor`, `uncoil` and `python -m uncoil` all run the setup checker."""
    args = sys.argv[1:] if argv is None else list(argv)
    return doctor.main(args[1:] if args[:1] == ["doctor"] else args)


if __name__ == "__main__":
    sys.exit(main())
