# Assumptions

- All unspecific distribution percentages use the spec defaults; systematic's 40/10/50 split is implemented exactly as supplied.
- Africa/Accra (`Africa/Accra`) is the timezone for week and Sabbath calculations.
- The "most recent Sabbath" includes today only when today is Saturday.
- Member contact data is limited to optional phone; gender and member number remain optional where permitted.
- If no rule exists for a report date, submission fails visibly rather than guessing.
- MFA is enabled in the UI only where supported by the Supabase project configuration.
- A church draft is offline-eligible; submission always requires a live authenticated server connection.
- Demo data is seeded non-destructively and uses placeholder auth identities documented in migration setup.
