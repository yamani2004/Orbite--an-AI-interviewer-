# Orbite

Orbite is a privacy-first interview practice platform for computer fundamentals, system design, and moderated 1:1 practice rooms.

## Stack

- **Frontend:** React + Vite, browser speech synthesis/recognition, Supabase Auth
- **Backend:** Java 17+, Spring Boot 3, Spring JDBC, Bean Validation
- **Data:** Supabase Postgres with Row Level Security

## Run locally

1. Create a Supabase project and run [supabase/schema.sql](supabase/schema.sql) in its SQL editor.
   Enable **Anonymous sign-ins** in Supabase Auth for the frictionless practice flow, or replace it with your preferred email/OAuth sign-in screen before release.
2. Copy `frontend/.env.example` to `frontend/.env` and add your Supabase URL/key and API URL.
3. For a local smoke test, start the API directly; it uses an in-memory H2 database by default. To use Supabase, set the environment values in `backend/.env.example` and activate the `supabase` profile.
4. Start the API: `cd backend; mvn spring-boot:run`.
5. Start the web app: `cd frontend; npm install; npm run dev`.

## Safety by design

Live rooms require clear consent before joining. Participants can leave instantly and file a report. The schema separates reports from room content, records only the minimum moderation metadata, and enables RLS so users can access only their own sessions and rooms they participate in. Do not record calls or use interview decisions for employment screening without explicit participant consent and a reviewed legal/privacy policy.

## Profiles

- `local` (default): in-memory H2 database and open local endpoints. Use only for development.
- `supabase`: Supabase Postgres plus verified Supabase JWTs. Run with `SPRING_PROFILES_ACTIVE=supabase` after setting the database and issuer environment variables.
