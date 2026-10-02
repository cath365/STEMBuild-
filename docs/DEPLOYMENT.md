# STEMBuild deployment checklist

## Local development

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL with `docker compose up -d` or use another PostgreSQL instance.
3. Run `npm install`.
4. Run `npm run db:generate`.
5. Run `npm run db:migrate` and name the first migration `initial_stembuild_schema`.
6. Run `npm run db:seed` only where synthetic DEMO records are wanted.
7. Run `npm run dev`.

## Vercel

1. Import the GitHub repository into Vercel.
2. Attach a PostgreSQL database and expose a production `DATABASE_URL`.
3. Create/attach a **private** Vercel Blob store for learner project evidence. Prefer Vercel's project-linked authentication in production; use `BLOB_READ_WRITE_TOKEN` only where a token is required by the environment/runtime.
4. Configure STEMBuild AI Lab Coach through Vercel AI Gateway. Set `AI_COACH_MODEL` (default `openai/gpt-6-luna`). Vercel project OIDC can authenticate Gateway calls; local/non-Vercel environments can use `AI_GATEWAY_API_KEY`.
5. Run the committed Prisma migrations against the production database with `npm run db:deploy` as part of the controlled release process.
6. Do **not** run the DEMO seed against a real school deployment unless synthetic demo accounts are explicitly desired.
7. Verify `/`, `/login`, all three role dashboards, evidence authorization, logout, and the PWA install metadata after deployment.

## Required production controls before a real pilot

- Replace all DEMO passwords and remove/disable DEMO users.
- Establish school/student consent and retention policies before collecting learner photos or identifying data.
- Define who may download or delete evidence and how long evidence is retained.
- Add audit logging for sensitive administrator and assessment changes before multi-school rollout.
- Add application-level rate limiting to login and upload routes before public exposure at scale.
- Back up PostgreSQL and document restore procedures.
- Keep practical scoring teacher-controlled; AI assistance must not silently overwrite rubric results.
- Verify AI Lab Coach privacy: a student can load only their own coach sessions and the model receives no quiz answer keys or other learners' records.
- Review AI coach recommendation logs and retention policy before a real pilot.

## Release gate

A production release should pass:

```bash
npm install
npm run db:generate
npm run typecheck
npm run lint
npm run build
```

Then test one complete workflow using synthetic data:

Teacher assigns lesson -> Student completes quiz -> Student submits practical evidence -> Teacher scores rubric -> Progress updates -> Credential remains locked/unlocked according to requirements.
