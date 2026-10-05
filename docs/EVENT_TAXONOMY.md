# Event taxonomy

| Event | Meaning / required ordering |
| --- | --- |
| landing_view | First observed product entry, at user creation |
| signup_started | Signup form begun, after entry |
| signup_completed | Completed signup, exactly `users.signup_at` |
| onboarding_started | Onboarding initiated after signup |
| onboarding_completed | Onboarding finished after it starts |
| core_action | A meaningful workspace action, after onboarding completion; repeatable |
| subscription_started | Account paid contract starts; attributed to initiating active member |
| subscription_cancelled | Contract cancelled, strictly after its start; same initiating member |

Each user has one landing/signup sequence and at most one onboarding sequence. Billing events
match contract timestamps exactly. Sessions are synthetic user-scoped visit identifiers; several
core actions may occur within one session. A billing event has a separate session identifier.

Properties currently permit exactly `{"source": "synthetic"}` in the generator. There is no free
text, arbitrary event-name generation or PII. New properties/events need a documented contract
and validator changes. Events at or beyond the observation cutoff are not emitted.
