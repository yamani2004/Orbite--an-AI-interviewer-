# Orbite realistic interview upgrade

## Included

- 45-second minimum interview-room preparation flow with staged setup messaging.
- Natural closing sequence: final interviewer prompt, candidate questions, closing acknowledgement, then report.
- DSA interviews require an implementation dry run plus complexity discussion.
- Database interviews include requirements, schema, ER diagram, indexing, transactions and scale stages.
- System design interviews include requirements, capacity estimation, architecture, reliability, security and observability.
- Personalized report with previous completed interview comparison, score deltas and previous-session advice.
- Individual roadmap generated from the current weak dimensions.
- Answer-box paste event detection with an integrity signal; it is intentionally not treated as proof of copying.
- Paste metadata persisted with answers for backend reporting.

## Important runtime note

The backend code has been updated for the new DTO/schema fields. The provided environment does not contain Maven or frontend dependencies, so a full Maven compile / Vite production build could not be executed here.

Run locally:

```bash
cd backend
mvn clean package

cd ../frontend
npm install
npm run build
```

Apply the updated Supabase/local schema migration before running the backend against an existing database.
