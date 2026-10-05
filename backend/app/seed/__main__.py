import argparse
import json

from app.database.session import get_engine
from app.seed.generator import SeedConfig, generate
from app.seed.loader import load
from app.seed.report import sanity_report
from app.seed.validation import validate


def main():
    parser = argparse.ArgumentParser(description="Seed fictional TaskHarbor product data")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--users", type=int, default=16000)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--reset", action="store_true", help="Replace all warehouse data atomically")
    mode.add_argument(
        "--if-empty", action="store_true", help="Preserve an existing dataset (Compose startup)"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Validate/report without database writes"
    )
    args = parser.parse_args()
    config = SeedConfig(seed=args.seed, users=args.users)
    data = generate(config)
    validate(data, config)
    if not args.dry_run:
        engine = get_engine()
        try:
            loaded = load(engine, data, reset=args.reset, if_empty=args.if_empty)
            if not loaded:
                print(json.dumps({"status": "preserved_existing_dataset"}))
                return
        except ValueError as exc:
            parser.exit(1, f"Seed refused: {exc}\n")
        finally:
            engine.dispose()
    print(json.dumps(sanity_report(data), indent=2))


if __name__ == "__main__":
    main()
