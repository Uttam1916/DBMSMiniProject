# Screenshots Directory

Drop your captured screenshots into this directory using the filenames below. They are already linked inside [`PROJECT_REPORT.md`](../PROJECT_REPORT.md#7-few-sample-screenshots-of-application-code--demo).

### Application Code Screenshots
1. `code_ddl_and_triggers.png` -> DDL table definitions, partial unique index, and trigger `sync_item_status_after_claim` in `campus_lost_found_setup.sql`.
2. `code_vector_generation.png` -> FastEmbed ONNX vector generator and `refreshItemMatches()` lateral join in `src/lib/embed.ts`.
3. `code_acid_claim_approval.png` -> Explicit `BEGIN ... COMMIT` with `FOR UPDATE` row lock and RBAC check in `src/app/api/claims/[id]/route.ts`.
4. `code_semantic_search_api.png` -> Vector cosine distance `<=>` vs keyword `ILIKE` in `src/app/api/search/semantic/route.ts`.

### Application Demo Screenshots
5. `demo_browse_items.png` -> Main item browse directory showing filter toggles (All/Lost/Found), Category, Location, Date, Status, and Search.
6. `demo_potential_matches.png` -> Lost item details drawer showing unconfirmed potential matches with similarity score (e.g. 75%).
7. `demo_report_item_modal.png` -> Report Item modal with on-the-fly vectorization fields.
8. `demo_my_activity.png` -> Student workspace showing "My Reports" and "My Claims".
9. `demo_claims_review_trigger.png` -> Staff claims adjudication queue showing claimant proof and green ACID trigger approval banner.
10. `demo_sql_console_profiling.png` -> Database Tools SQL Console executing Query 4 (Recursive Query) with millisecond execution time.
11. `demo_semantic_vs_keyword.png` -> Database Tools Semantic vs Keyword comparison tester demonstrating vocabulary mismatch resolution.
