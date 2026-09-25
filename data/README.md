# Test people database

Shared demo data for Students, Chats, Calls, and student profiles.

## Files

- `people.csv` — one row per person (student or parent)
- `visits.csv` — profile views (`person_id`, timestamp, source, seconds)
- `calls.csv` — scheduled calls for connected people (rebuild with `python3 scripts/build-calls-db.py`)

After editing people or visits, rebuild:

```bash
python3 scripts/build-people-db.py
python3 scripts/build-calls-db.py
```

That writes `js/people-db.js` and `js/calls-db.js`. Pages load the JS files, not the CSV directly, so `file://` works.

## `people.csv` columns

| Column | Meaning |
| --- | --- |
| `id` | Stable id used in chat, call, and profile URLs |
| `name`, `initials`, `role` | `student` or `parent` |
| `connected` | `1` = paid connect (can chat) |
| `email`, `source` | Visit / acquisition source |
| `service` | Optional booked service (not shown on Students) |
| `forWho` | Parent context, e.g. `For Meera Kapoor` |
| `connectedOn` | `YYYY-MM-DD HH:MM` when they connected |
| `amount` | Connect fee paid (`1999` when connected, empty otherwise) |
| `amber` | Avatar tint |

## `visits.csv` columns

| Column | Meaning |
| --- | --- |
| `person_id` | Matches `people.id` |
| `at` | Last profile view stamp `YYYY-MM-DD HH:MM` |
| `source` | Where that visit came from |
| `seconds` | Time on profile (analytics) |

## `calls.csv` columns

| Column | Meaning |
| --- | --- |
| `id` | Call id (`c-{person_id}`) |
| `person_id` | Connected person from `people.csv` |
| `service` | Session type |
| `day`, `time` | Scheduled slot |
| `mins` | Booked length |
| `status` | `upcoming` or `done` |
