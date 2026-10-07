# Local demo operation

Requires Docker Desktop with Linux containers and Compose v2. The launcher runs from its own
repository directory, so paths containing spaces are supported. It checks the Docker daemon,
builds services, waits for health, verifies HTTP readiness and opens the browser on success.
Failure messages remain visible. `START_PRODUCT_PULSE.bat -NoBrowser` is useful for acceptance tests.

## Ownership and persistence

The launcher always uses Compose project `productpulse-local` and `.runtime/local.env`.
It never uses a parent repository or stops unrelated processes. PostgreSQL data is stored in
`productpulse-local_postgres_data`. `STOP_PRODUCT_PULSE.bat` uses scoped `compose stop`, not
`down -v`. The earlier development stack, if present under another project name, is unaffected.

Migrations run before the seed job; API health gates the frontend. The seed's `--if-empty` guard
is transactional and serialized: any existing warehouse rows cause preservation, not replacement.
It does not silently repair partially edited data. Use the read-only validation helper to investigate.

## Diagnose startup

- Start Docker Desktop before launching. Install Compose v2 if Docker does not include it.
- The first build needs registry access and enough disk/memory for Python, Node and PostgreSQL.
- Resolve port conflicts by editing `POSTGRES_PORT`, `API_PORT` or `FRONTEND_PORT` in the ignored
  launcher environment. Do not kill other applications globally.
- Inspect scoped logs and status from the root:

```sh
docker compose -p productpulse-local --env-file .runtime/local.env ps -a
docker compose -p productpulse-local --env-file .runtime/local.env logs --tail 100 api frontend migrate seed
```

Never publish the environment file or database volume. Passwords are randomly generated on first
Windows launch. The example environment has placeholders only. A new password in the file does
not rotate an initialized PostgreSQL password; preserve the original file between normal launches.

## Explicit replacement (destructive, optional)

Normal start/stop never replaces data. Only when you intentionally want to replace the six
synthetic warehouse tables, after considering any local edits:

```sh
docker compose -p productpulse-local --env-file .runtime/local.env run --rm --no-deps api python -m app.seed --reset --seed 42
```

This operation is separate from launch and transactional. Do not use `docker system prune` or
remove unrelated volumes. No automatic reset is provided.
