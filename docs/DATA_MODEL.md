# Data model

All timestamps are PostgreSQL `timestamptz`, generated in UTC. Synthetic integer identifiers are
stable within a seed/configuration, not globally unique across reseeds. Every table has a primary
key; event properties are JSONB. Event IDs represent generation order, not chronological order.

| Table | Grain and important relationships |
| --- | --- |
| accounts | One fictional company/workspace, creation timestamp and company size |
| users | One synthetic member; account FK, creation and signup timestamps, country/channel/device |
| events | One event; user FK, session ID, controlled name, timestamp, JSONB properties |
| subscriptions | At most one paid contract per account; initiating user FK, plan, start/end, monthly value |
| experiments | One experiment definition; enrollment interval, status and primary metric |
| experiment_assignments | One experiment/user pair; variant and assignment timestamp |

Users can exist a few minutes before completed signup. This gives the synthetic landing and signup
events a valid identity without placing events before user creation. Every generated user eventually
completes signup: this dataset supports **post-signup** drop-off, not anonymous acquisition conversion.

Account membership is fixed; countries are shared within an account. Channel/device belong to the
user. Company size is a synthetic segment rather than a count of observed seats.

Free accounts have no paid contract. Paid plans are `pro` and `business`; currency is uniformly
USD and values are exact two-decimal amounts. Cancellation takes effect immediately. After cancellation
an account is free, so core actions can continue. No renewals, reactivations, upgrades, invoices,
trial periods or seat changes are modeled. Future needs require an explicit migration.

Indexes: account FK and signup date on users; (user, time), (event name, time), and time on events;
subscription start/cancellation dates and unique account; experiment/user composite PK plus user
index on assignments. No speculative JSONB GIN index.

Database constraints enforce foreign keys, category values, nonnegative/positive contract amounts,
signup order, subscription order and experiment window order. Application validation additionally
enforces account/user ownership, event sequences, billing-event parity and assignment-before-outcome.
