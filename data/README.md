# Demo data

`people.csv`, `visits.csv` and `calls.csv` provide the shared student/parent, profile-view and scheduled-call fixtures.

After editing people or visits, rebuild the browser data modules consumed by Next.js:

```bash
python3 scripts/build-people-db.py
python3 scripts/build-calls-db.py
```

Outputs are `src/lib/domain/people-db.js` and `src/lib/domain/calls-db.js`. The calls generator also refreshes `data/calls.csv`. They export browser-only initialization functions, called by the shared runtime once per app session.

People retain stable IDs across People, Chats, Meet, student profiles and transactions. `connected=1` identifies a paid demo connection. All money and activity fixtures are demo data.
