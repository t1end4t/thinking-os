# Paper Scouting Discussion

Status: product discovery, before app redesign.

Last updated: 2026-09-21.

## Product Goal

Thinking OS should help the user find a small set of papers worth reading. It should not merely return search results. The system must preserve why each paper was found, why it may matter, and what remains uncertain before the user accepts it into the research workspace.


## Decision Summary

- Build problem-driven scouting before daily topic watches.
- Let the assistant create and start scouts, but store reports outside chat.
- Run scouting as detached persisted jobs.
- Use OpenAlex, arXiv, and Crossref first.
- Screen titles and abstracts, then inspect full text only on demand.
- Separate relevance from quality confidence.
- Return at most five manual recommendations or three daily recommendations; zero is valid.
- Save papers only through explicit user action, with discovery provenance.
- Never create claims or evidence from recommendations automatically.
- Keep the existing literature form until the replacement reaches parity.


## Two Scouting Modes

### 1. Problem-Driven Scout

This mode starts from the research problem currently being discussed in the assistant panel.

Example: the user is investigating TinyML for autoresearch.

Proposed flow:

1. The user discusses the problem with the assistant.
2. The assistant breaks the problem into concepts, constraints, and search directions.
3. The assistant proposes search queries and explains the purpose of each query.
4. When the user asks to scout, the assistant delegates the search and screening work to an agent.
5. The agent searches candidate papers, then reads at least the title and abstract.
6. The agent returns a short screened set, not an unfiltered result list.
7. Each recommendation includes its relevance, expected value, limitations, and provenance.
8. The user decides which papers enter the reading or research workflow.

The existing standalone literature input may become redundant if the assistant panel can create, inspect, and run the same scouting request. This is not yet a design decision.

### 2. Topic-Driven Daily Scout

This mode starts from a durable interest rather than a current research question.

Example: the user wants a small daily reading set about LLM agents.

Proposed flow:

1. The user defines a topic and reading intent.
2. A scheduled scout runs at a configured time, such as every morning.
3. The scout searches recent and notable work.
4. It applies a strict quality threshold and returns only a small set.
5. It explains why each paper passed the threshold.
6. It avoids repeatedly recommending papers already seen, dismissed, saved, or read.

Quality may use several signals, but no single signal is sufficient:

- Author track record in the relevant field.
- Venue quality and relevance.
- Acceptance at a selective conference or journal.
- Citation or community attention, adjusted for paper age.
- Methodological clarity and evidence visible from available metadata or text.
- Novelty relative to papers already known to the user.
- Relevance to the user's stated reading intent.

## Important Distinction

These are two scouting intents, not two mutually exclusive kinds of paper:

- Problem-driven scouting optimizes for direct relevance to an active question.
- Topic-driven scouting optimizes for sustained, high-quality awareness.

The same paper may be found by both modes. The system should merge duplicates while preserving both discovery reasons.

## Shared Requirements

- Quality over quantity.
- Screening before presentation.
- Explicit reasons for every search query and recommendation.
- Clear separation between verified metadata, model inference, and user judgment.
- No invented conclusions, citations, venue status, or paper quality claims.
- Durable provenance: scout, query, source, run time, and recommendation reason.
- User control over acceptance, dismissal, saving, and reading status.
- Feedback should improve future ranking without silently hiding candidates.

## Initial Open Decisions

1. What does "worth reading" mean for each scouting mode?
2. How many recommendations should one run return?
3. Must the scout read only title and abstract, or retrieve full text when available?
4. Should the problem-driven scout require user approval of queries before execution?
5. Should the daily scout include only new papers, or also older foundational papers?
6. How should venue and author reputation affect ranking without becoming a prestige-only filter?
7. What should happen when metadata is incomplete or quality cannot be verified?
8. Which user actions should affect future recommendations: save, dismiss, read, cite, or explicit feedback?
9. Should scheduled scouting run only while the local app is active, or through an external local scheduler?
10. Which existing literature controls remain useful after assistant-driven scouting exists?

## Deferred Until After Discussion

- UI layout and navigation.
- Removal of the existing literature input.
- Agent architecture and provider choice.
- Search sources and APIs.
- Ranking formula.
- Persistence schema and migration.
- Scheduler implementation.

## First Implementation Strategy

Start with problem-driven scouting. It has a clear user-provided question, requires no scheduler, and gives faster feedback about query quality and recommendation quality.

Implementation order:

1. Define the scout brief and scout report contracts.
2. Exercise the contracts manually with real research questions.
3. Let the assistant create and revise a scout brief.
4. Let an agent execute the approved brief.
5. Persist the report and user decisions.
6. Reuse the proven pipeline for scheduled topic scouting.
7. Redesign or remove the existing literature controls only after the replacement covers their useful behavior.

## Scout Brief

A scout brief is an inspectable search plan. It is created from the conversation, but it must not exist only as chat text.

Required fields:

- `question`: the concrete research question or information need.
- `purpose`: what decision or research activity the papers should support.
- `scope`: included concepts, methods, domains, populations, or systems.
- `exclusions`: known irrelevant meanings, methods, domains, or paper types.
- `constraints`: date range, access requirement, publication type, language, or other limits.
- `queries`: proposed search queries.
- `queryReasons`: the search direction covered by each query.
- `screeningCriteria`: conditions used to recommend, reject, or mark a paper uncertain.
- `maxRecommendations`: the maximum shortlist size, initially five.
- `createdFrom`: provenance pointing to the user request or assistant conversation context.

The brief should be editable before execution. The user should not need to approve every run forever, but the first implementation should make the plan visible and require an explicit start action.

## Scout Report

A scout report is the durable result of one executed brief. It is not a chat response and not merely a list of papers.

Run-level fields:

- `briefId`: the brief that defined the run.
- `startedAt` and `completedAt`.
- `sources`: providers or indexes actually searched.
- `executedQueries`: queries actually sent, including agent-generated expansions.
- `candidateCount`: candidates retrieved before screening.
- `recommendations`: papers considered worth the user's attention.
- `uncertain`: promising papers that could not be assessed confidently.
- `rejections`: optional rejection records or aggregate rejection reasons.
- `limitations`: unavailable abstracts, incomplete metadata, source failures, or coverage limits.
- `status`: completed, partial, failed, or cancelled.

Each recommendation should contain:

- Verified paper identity and bibliographic metadata.
- Matching query and discovery source.
- `relevanceAssessment`: how the paper relates to the question.
- `expectedValue`: what the user may learn or use from it.
- `qualityEvidence`: observable signals supporting credibility.
- `limitations`: missing information or reasons for caution.
- `relevanceLevel`: direct, supporting, background, or irrelevant to this brief.
- `qualityConfidence`: high, medium, or low confidence in the available quality evidence.
- `recommendationReason`: a short final reason for inclusion.
- User state: unseen, saved, dismissed, reading, read, or cited.

## Assessment Rules

Relevance and quality must remain separate:

- Relevance asks whether the paper helps answer the current question.
- Quality confidence asks whether available evidence supports trusting or prioritizing the paper.

The scout must distinguish:

- Verified fact: metadata or text directly obtained from a source.
- Model inference: interpretation of the title, abstract, venue, or other evidence.
- Missing evidence: information the scout could not verify.
- User judgment: the user's later decision about usefulness.

A paper may be highly relevant with low quality confidence. It should appear as uncertain rather than be silently removed. A prestigious but indirect paper should not outrank a directly useful paper solely because of reputation.

## First Prototype Boundaries

The first prototype should:

- Support only manual, problem-driven runs.
- Use the current literature retrieval path where practical.
- Read titles and abstracts when available.
- Return no more than five recommendations.
- Allow zero recommendations.
- Preserve queries, reasons, sources, and assessment limitations.
- Let the user save, dismiss, or request deeper inspection.

The first prototype should not yet:

- Run on a daily schedule.
- Claim to assess full methodology without full text.
- Automatically download or analyze every PDF.
- Learn an opaque ranking model from user behavior.
- Remove the existing literature form before replacement behavior is proven.
- Treat author or venue prestige as a mandatory gate.

## Prototype Evaluation

Evaluate the workflow with at least three questions:

1. A narrow technical question with precise terminology.
2. A broad emerging topic with noisy terminology.
3. An ambiguous question with terms used by multiple fields.

For each run, evaluate:

- Query coverage: did the brief search the important interpretations?
- Screening precision: were clearly irrelevant papers excluded?
- Shortlist value: would the user open the recommended papers?
- Explanation quality: can the user inspect why each paper was included?
- Calibration: did the scout expose uncertainty and missing evidence?
- Provenance: can each recommendation be traced to a query and source?
- Efficiency: did the shortlist save meaningful reading time?

The prototype is successful only if its shortlist is consistently more useful than directly viewing the first search results.

## Candidate Screening Pipeline

Screening should be a staged decision process, not one opaque score. Each stage answers a different question and records why a candidate continues or stops.

### Stage 1: Normalize Identity

- Normalize DOI, title, authors, year, and canonical URL.
- Merge duplicates returned by different queries or sources.
- Preserve every matching query and discovery source.
- Match against papers already seen, saved, dismissed, read, or cited.

A repeated paper is not a new recommendation. It may still appear when the current brief gives it a materially new reason for relevance.

### Stage 2: Check Eligibility

Reject candidates that clearly violate the approved brief:

- Wrong field or meaning of an ambiguous term.
- Outside an explicit date range.
- Disallowed publication or document type.
- Missing minimum metadata needed for identification.
- Retracted or corrected in a way that invalidates the relevant result, when this can be verified.

Eligibility is a factual filter. The scout should not use perceived quality at this stage.

### Stage 3: Assess Relevance

Classify relevance using the title and abstract:

- `direct`: studies the target problem, method, system, or relationship.
- `supporting`: informs a necessary component, comparison, dataset, or evaluation method.
- `background`: provides useful context but does not address the active question.
- `irrelevant`: does not materially support the brief.

The assessment must cite the specific concept or claim in the available title or abstract that supports the classification. If the abstract is unavailable, the scout must lower confidence rather than infer details from the title alone.

### Stage 4: Estimate Reading Value

For direct and supporting candidates, state what reading the paper could provide:

- A method the user could adopt or compare.
- Evidence relevant to a claim.
- A dataset, benchmark, metric, or experimental design.
- A failure mode or limitation.
- A useful survey or synthesis.
- A conflicting result that could falsify an assumption.

This stage asks whether opening the paper is likely to advance the user's work. It must not claim that the paper actually proves more than the available text states.

### Stage 5: Assess Quality Evidence

Record observable quality signals separately from relevance:

- Venue and publication status, when verified.
- Study design described in the abstract.
- Presence of experiments, comparisons, baselines, or evaluation data.
- Availability of code, data, appendices, or full text.
- Author or group track record, when verified and relevant.
- Citation or community signals, adjusted for publication age.
- Retraction, correction, or conflict indicators.

Quality confidence should be categorical:

- `high`: several relevant signals are verified and consistent.
- `medium`: some useful signals are verified, but important evidence is unavailable.
- `low`: the judgment relies mainly on sparse metadata, title, or unverified signals.

Avoid a precise numeric quality score in the first prototype. It would imply calibration that the system has not established.

### Stage 6: Assign an Outcome

Each candidate receives one outcome:

- `recommend`: strong expected reading value for the current brief.
- `uncertain`: potentially useful, but evidence is insufficient or conflicting.
- `reject`: irrelevant, ineligible, redundant, or too weak to justify the user's time.

A recommendation should normally require direct or supporting relevance. Background papers should be recommended only when they fill an explicit knowledge gap.

### Stage 7: Build the Shortlist

The shortlist should optimize coverage, not simply take the highest-ranked candidates:

- Prefer papers that cover distinct parts of the brief.
- Avoid several papers making the same contribution unless comparison is useful.
- Include a conflicting or critical paper when it tests an important assumption.
- Do not fill the maximum count when fewer papers pass the threshold.
- Return at most five recommendations in the first prototype.

The final ordering should answer: "Which paper should the user inspect first, and why?"

## Screening Output

For each recommended or uncertain paper, show:

- One-sentence relevance assessment.
- One-sentence expected reading value.
- Relevance level.
- Quality confidence.
- Evidence used for the assessment.
- Important uncertainty or limitation.
- Matching queries and sources.
- A suggested next action: open abstract, inspect full text, save, or compare.

For rejected papers, persist a machine-readable reason. The default UI does not need to show every rejection. It should show rejection counts by reason and allow inspection of close candidates when needed.

## Screening Safety Rules

- Never infer paper findings from title, venue, author reputation, or citation count alone.
- Never describe acceptance status unless a reliable source verifies it.
- Never treat preprint status as proof of low quality.
- Never treat a top venue as proof that a paper is relevant or correct.
- Never hide missing abstracts or failed sources.
- Never state that the full paper was reviewed when only metadata or an abstract was available.
- Preserve contradictory papers when they materially test the user's assumptions.

## Result Presentation and Handoff

The assistant panel should announce and control scouting, but it should not become the only place where results live. A chat transcript is poor at comparison, durable status, and later retrieval.

Use three product roles:

- Assistant panel: understand intent, draft the brief, start the run, report progress, and summarize the outcome.
- Discovery surface: hold the durable scout report, candidate assessments, comparisons, and run history.
- Papers surface: hold papers the user has accepted for reading or research use.

This preserves a clear boundary: discovery candidates are not yet library papers.

## Assistant Panel Experience

Before execution, the assistant should show a compact scout brief:

- Research question.
- Included scope and important exclusions.
- Number of proposed search directions.
- Screening standard.
- Maximum recommendation count.

Primary action: `Run scout`.

Secondary action: `Review brief`.

During execution, the assistant should show stage-level progress rather than invented precision:

- Preparing queries.
- Searching sources.
- Deduplicating candidates.
- Screening titles and abstracts.
- Building the shortlist.

Do not display a fabricated percentage when the total work is unknown. The user may cancel the run without losing a completed partial report.

After execution, the assistant should show only a concise summary:

- Number of candidates screened.
- Number recommended and uncertain.
- One line for each recommendation.
- Important search limitation or failure.
- Action to open the full report.

The assistant should not print every candidate into chat.

## Discovery Report Experience

The full report should make comparison easy. Its default view should prioritize recommendations, then uncertain candidates, then aggregate rejection information.

Each recommended paper card should answer five questions without opening another panel:

1. What is this paper?
2. Why is it relevant to this specific brief?
3. What may the user gain by reading it?
4. What evidence supports the assessment?
5. What is uncertain or missing?

Primary paper actions:

- `Save to Papers`: accept the paper into the reading workspace.
- `Inspect deeper`: request full-text or richer-metadata assessment when available.
- `Compare`: place selected candidates into a side-by-side comparison.
- `Dismiss`: record that the paper is not useful for this purpose.

Secondary actions:

- Open the publisher, DOI, preprint, or source page.
- View matching queries and sources.
- View the abstract.
- Correct metadata or flag a bad assessment.

## Paper State Transitions

A discovered candidate should move through explicit states:

1. `candidate`: retrieved but not yet screened.
2. `recommended`, `uncertain`, or `rejected`: scout assessment outcome.
3. `saved` or `dismissed`: user decision for this discovery context.
4. `reading`, `read`, or `cited`: later research workflow state after saving.

The scout assessment and user decision are different records. Saving a paper does not prove that the recommendation was correct. Dismissing it does not prove that the paper is generally poor.

A dismissal should include an optional reason:

- Not relevant.
- Already known.
- Too weak or incomplete.
- Duplicate contribution.
- Not useful now.
- Other user reason.

`Not useful now` should permit future recommendation under a different brief. `Already known` should suppress duplicate novelty claims but preserve the paper's relevance to later reports.

## Saving to Papers

`Save to Papers` should create or reuse one durable paper record. It must not create a duplicate when the same DOI, canonical URL, or normalized title already exists.

The saved paper should retain discovery provenance:

- Scout report and brief identifiers.
- Matching queries.
- Recommendation reason.
- Assessment evidence level: metadata, abstract, or full text.
- Date saved.
- User decision source.

If the paper already exists in Papers, the action should add the new discovery context rather than create another paper.

The Papers surface should remain the place for actual reading, highlighting, evidence creation, and links to claims. The scout should not create evidence or scientific claims merely because a paper was recommended.

## Deeper Inspection

`Inspect deeper` should be a separate, explicit operation because it may require more time, network access, and model work.

Its goal is not to summarize the whole paper by default. It should answer the uncertainty that blocked a confident decision, such as:

- Does the evaluation use the target hardware or dataset?
- Is the claimed comparison fair?
- Does the method satisfy a constraint omitted from the abstract?
- Is the relevant result empirical, theoretical, or speculative?
- Is code or data actually available?

The operation should record which sections or pages were inspected. If full text is unavailable, the report should remain uncertain.

## Comparison View

Comparison should be question-driven, not a generic feature matrix. The comparison columns should come from the scout brief and candidate assessments.

Useful comparison dimensions include:

- Relation to the research question.
- Method or approach.
- Evaluation setting.
- Dataset, hardware, benchmark, or domain.
- Main relevant contribution.
- Evidence level available to the scout.
- Important limitation.
- Expected use in the user's work.

Unknown values should remain unknown. The agent should not fill cells by guessing.

## Handoff Acceptance Rules

The interaction is acceptable when:

- The assistant can start a scout without forcing the user into a separate form.
- The user can inspect and revise the brief before execution.
- Results remain available after chat messages move on.
- Candidate, scout assessment, and user decision remain distinguishable.
- Saving creates one durable paper and preserves discovery provenance.
- A saved paper enters the existing reading workflow without becoming evidence automatically.
- Dismissed and previously seen papers reduce repetition without being erased.

## Topic-Driven Daily Scout

A daily scout is a persistent research watch, not a repeated keyword search. Its purpose is to spend a fixed amount of the user's attention on the most useful additions to a topic.

The system should call this object a `Topic Watch`. A watch produces scout reports using the same screening and recommendation model as problem-driven scouting.

## Topic Watch Contract

Required fields:

- `name`: a short recognizable label.
- `topic`: the durable subject being monitored.
- `purpose`: why the user wants to follow it and what kinds of decisions or learning it should support.
- `scope`: included subtopics, approaches, domains, or research communities.
- `exclusions`: meanings, document types, or subtopics that create noise.
- `searchDirections`: durable search directions with reasons, not only raw keywords.
- `cadence`: initially daily or manual.
- `localTime`: preferred run time.
- `timeZone`: explicit scheduling time zone.
- `maxRecommendations`: default three.
- `recencyPolicy`: recent only, mixed, or foundational-gap mode.
- `qualityThreshold`: minimum evidence expected for the main digest.
- `enabled`: whether scheduled runs are active.
- `createdFrom`: user and assistant provenance for the watch definition.

Optional fields:

- Preferred venues, authors, labs, datasets, or benchmarks.
- Blocked terms, sources, or document types.
- A starting list of papers the user already knows.
- Maximum reading budget expressed as papers per run, not estimated minutes.

Preferred authors and venues are positive signals. They must not become exclusive filters unless the user explicitly requests an author- or venue-specific watch.

## Daily Discovery Policy

Each run should look for three kinds of value:

- `frontier`: recent work that materially advances or challenges the topic.
- `foundational`: older work that fills a clear gap in the user's known set.
- `corrective`: replications, negative results, critiques, retractions, or conflicting evidence.

The default `mixed` policy should prioritize frontier work while allowing foundational or corrective papers when they provide more value than another recent paper.

A daily scout should never manufacture a balanced quota. It may return only one category or no recommendations.

## Quality Gate

A paper belongs in the main daily digest only when:

- It is directly or strongly supportively relevant to the watch.
- It provides new information relative to the user's known and previously surfaced papers.
- Its expected reading value is explicit.
- Its identity and core metadata are verified.
- At least enough evidence exists to assign medium quality confidence.
- No unresolved warning makes recommendation irresponsible.

Potentially important papers with low confidence should enter an `uncertain` section. They should not consume the main recommendation budget or trigger the same level of notification.

Venue, author, and citation signals may raise confidence. They cannot substitute for topic relevance or observable methodological information.

## Novelty and Repetition Control

Novelty is relative to the user, not merely publication date.

Before recommending a candidate, compare it with:

- Papers already saved in Papers.
- Papers previously recommended by this or another watch.
- Papers dismissed by the user.
- Papers marked as already known, reading, read, or cited.
- Earlier versions of the same work.
- Papers with substantially duplicate contributions.

Default repeat rules:

- Do not recommend the same paper twice for the same reason.
- Merge preprint and published versions into one paper identity when evidence supports the match.
- Update metadata when publication status changes; do not present the update as a new paper by default.
- Permit a repeated paper when a new watch or research brief gives it a materially different role.
- Permit resurfacing when the paper changed substantially, new evidence appeared, or the user requested reminders.
- Record why a repeated paper was allowed.

The system should distinguish `new to the sources`, `new to the workspace`, and `new to the user`. Only the user can confirm the last category.

## Daily Shortlist Construction

The default daily report should contain zero to three recommendations.

Selection priorities:

1. Expected information gain for the watch purpose.
2. Direct relevance.
3. Novelty relative to known papers.
4. Quality confidence.
5. Coverage diversity.
6. Recency.

Recency comes last among these priorities because a newer paper is not automatically more useful.

When several papers make similar contributions, recommend the strongest representative and list the others as related candidates. When evidence is close, prefer diversity across methods, findings, or research groups.

## Digest Experience

Daily results should appear as one digest, not several independent notifications.

The digest summary should show:

- Watch name and run date.
- Number of sources searched and candidates screened.
- Zero to three recommendations.
- Any uncertain high-potential candidates.
- Important source failures or coverage limits.
- Whether the run was scheduled, delayed, caught up, or manual.

Each recommendation should explain:

- Why it appears today.
- What is new relative to known papers.
- Why it passed the quality gate.
- What the user is expected to gain by reading it.
- Which paper should be read first.

If nothing passes the threshold, show a successful empty digest: `No paper justified your attention today.` This is a positive quality outcome, not a failed run.

## Scheduling Semantics

The current literature scheduler lives inside the local application process. The first daily-scout version should use this existing local behavior rather than add an operating-system service.

Initial semantics:

- A scheduled run occurs only while the local application process is active.
- The schedule uses an explicit local time and time zone.
- If the scheduled time was missed, the next application session may run one catch-up report.
- Multiple missed days should not create multiple queued reports.
- A manual run should not silently change the next scheduled time.
- Concurrent runs of the same watch are forbidden.
- The user can pause, resume, run now, edit, or delete a watch.
- Deleting a watch must not delete saved papers or historical reports without a separate explicit action.

The UI must state that the schedule is local-process-dependent. A future operating-system scheduler is justified only if users need scouting while Thinking OS is closed.

## Daily Feedback

User actions should tune future selection through explicit, inspectable signals:

- `Save`: this paper was worth retaining.
- `Dismiss as irrelevant`: narrow topic interpretation.
- `Already known`: reduce novelty, not relevance.
- `Not useful now`: suppress for this watch without making a universal quality judgment.
- `Too similar`: increase contribution diversity.
- `Poor quality`: lower confidence in similar evidence patterns, subject to user explanation.
- `More like this`: strengthen the identified search direction, not merely the author or venue.

The first version should store these signals and apply deterministic rules. It should not introduce an opaque learned ranking model.

## Daily Scout Acceptance Rules

The recurring workflow is acceptable when:

- A watch expresses purpose and scope, not only keywords.
- A run may return zero papers without being treated as failure.
- The same paper is not repeatedly presented without a recorded new reason.
- The main digest contains no more than three recommendations by default.
- Quality evidence and topic relevance remain separate.
- Missed local schedules have predictable catch-up behavior.
- Users can inspect why a paper appeared today.
- Feedback changes future behavior through visible rules.
- Scheduled scouting does not require new background-service infrastructure in the first version.

## Retrieval Strategy

The scout should use sources by role. It should not treat all providers as interchangeable search engines or merge fields without provenance.

The first implementation should use a small layered stack:

1. OpenAlex for broad lexical and semantic candidate discovery.
2. arXiv for recent preprints in relevant subject areas.
3. Crossref for DOI-centered metadata verification, publication relationships, and update signals.
4. OpenAlex open-access locations for legal full-text discovery.
5. OpenReview only when a candidate's venue or decision status materially affects the assessment and that venue uses OpenReview.

Semantic Scholar should remain an optional later enrichment source. Its citation graph, references, recommendations, and abstracts may improve recall, but the first prototype does not need another general index before the core workflow is validated.

## Source Roles

### OpenAlex: Primary Discovery Index

Use OpenAlex as the main broad index because it supports:

- Search across titles, abstracts, and indexed full text.
- Boolean, exact, phrase, proximity, fuzzy, and semantic search.
- Work, author, source, institution, topic, citation, and open-access relationships.
- DOI and other external identifiers for cross-source reconciliation.
- Lexical search for precise technical terms.
- Semantic search for long problem descriptions and terminology discovery.

Do not trust its relevance ordering as the final scout ranking. Its documented lexical relevance combines text similarity with citation count, which may favor older or already popular work. The scout must rescreen candidates against the brief.

OpenAlex records are aggregated and may contain entity-matching errors. Preserve the OpenAlex identifier, but use DOI or another persistent identifier as the stronger cross-provider identity when available.

### arXiv: Recent Preprint Lane

Use arXiv as a focused lane for fields where preprints matter, especially computer science, mathematics, physics, statistics, quantitative biology, and related areas.

Use it for:

- Recent submissions and updates.
- arXiv category filtering.
- Version-aware identity.
- Title, abstract, authors, submission dates, links, DOI, and journal references when supplied.

Respect arXiv's API guidance:

- Cache identical daily queries.
- Avoid rapid repeated calls.
- Use small result windows.
- Prefer focused queries over large result harvesting.

arXiv presence means that a manuscript was submitted to arXiv. It does not verify peer review, conference acceptance, journal publication, or methodological quality.

### Crossref: DOI and Publication Verification

Use Crossref after candidate discovery rather than as the only discovery source.

Use it for:

- DOI lookup and canonical DOI normalization.
- Publisher-deposited bibliographic metadata.
- Publication dates, types, container titles, ISSNs, licenses, funders, ORCIDs, and RORs when deposited.
- Relations between preprints and published works when available.
- Corrections, retractions, and other update relationships when available.
- Abstracts and full-text links when deposited.

Crossref metadata completeness varies by publisher and field. A missing abstract, relation, or acceptance date means unknown, not absent.

The first prototype should keep Crossref as a verification and fallback source while replacing Crossref-only candidate retrieval with the layered strategy.

### Open-Access Location Resolution

Use OpenAlex's `open_access` and `best_oa_location` data before adding a separate Unpaywall integration. OpenAlex and Unpaywall currently expose the same underlying open-access data in different formats.

The scout should distinguish:

- A verified legal open-access location.
- A publisher landing page without accessible full text.
- A preprint or accepted manuscript.
- An unknown or inaccessible full-text location.

Do not download PDFs automatically during broad candidate retrieval. Resolve and retrieve full text only for user-requested deeper inspection or a narrowly bounded screening need.

### OpenReview: Selective Decision Verification

Use OpenReview only for venues and papers represented there.

Use it for:

- Submission identity.
- Public reviews, comments, rebuttals, meta-reviews, and decisions when available.
- Venue-specific acceptance, withdrawal, rejection, or desk-rejection status when the relevant records clearly expose it.

Do not infer that absence from OpenReview means rejection or lack of quality. Many venues do not use it, and public data varies by venue and year.

## Search Lanes

Each scout run should execute several bounded retrieval lanes. Every lane records its purpose and source.

### Lane A: Precise Lexical Search

Use technical phrases, acronyms, named methods, constraints, datasets, hardware, and evaluation terms derived from the brief.

Purpose: high precision and transparent query reasoning.

### Lane B: Semantic Problem Search

Use a concise problem description rather than only keywords.

Purpose: find conceptually related work that uses different terminology.

Semantic results are candidate generators. They require the same title-and-abstract screening as lexical results.

### Lane C: Recent Preprint Search

Use recent-date and field constraints in OpenAlex and relevant arXiv categories.

Purpose: detect frontier work before formal publication metadata is complete.

### Lane D: Citation-Neighborhood Expansion

Expand from a small number of strong seed papers:

- References identify earlier foundations and methods.
- Citations identify later extensions, replications, and critiques.
- Related-work similarity identifies terminology variants and parallel approaches.

Do not run graph expansion from every candidate. Expand only from strong seeds, with a fixed depth of one hop in the first version.

### Lane E: Known-Entity Search

Search verified author, lab, venue, dataset, benchmark, or project identities requested by the user.

Prefer persistent identifiers such as DOI, ORCID, OpenAlex ID, ISSN, or arXiv ID over name-only matching. Names are ambiguous and should not become durable identities without verification.

## Retrieval Budget

Quality requires enough recall for screening, but unbounded retrieval wastes provider calls and agent context.

Initial per-run budget:

- Three to six search directions.
- Up to twenty candidates per query before deduplication.
- At most one semantic query per major search direction.
- At most three strong seeds for citation-neighborhood expansion.
- One citation hop.
- A soft cap of one hundred unique candidates before title screening.
- A smaller abstract-screening pool after title filtering.

These are operational ceilings, not user-visible promises. The report should record when a ceiling truncated a search lane.

## Candidate Merge and Field Provenance

Identity precedence:

1. DOI.
2. arXiv identifier plus version relationship.
3. PubMed or another stable domain identifier.
4. OpenAlex work identifier.
5. Normalized title, author overlap, and year as a cautious fallback.

A fuzzy match must not silently merge uncertain records. Mark uncertain identity for inspection.

For every merged field, retain its source. Prefer fields by role rather than one global provider order:

- DOI and publisher metadata: Crossref when present and coherent.
- arXiv version and submission dates: arXiv.
- Open-access locations: OpenAlex.
- Citation graph and topic relations: OpenAlex initially.
- Venue decision: official venue record or OpenReview when applicable.
- User corrections: user-authored value, preserved separately from external metadata.

Conflicting source values should remain inspectable. Do not overwrite disagreement without recording it.

## Source Failure and Partial Runs

A scout run may complete as `partial` when one provider fails but remaining evidence supports a useful report.

Rules:

- Record every attempted source and its outcome.
- Retry only transient failures, with a small bounded retry count.
- Continue independent lanes when one source fails.
- Lower confidence when a missing source removes needed verification.
- Do not replace a failed source's facts with model guesses.
- Do not describe a partial run as comprehensive.
- Allow the user to rerun only failed lanes.

Provider-specific ranking should never be treated as an objective quality score.

## First Retrieval Implementation

The smallest useful change from the current system is:

1. Keep Crossref parsing and DOI verification.
2. Add OpenAlex lexical discovery.
3. Add one OpenAlex semantic query derived from the scout brief.
4. Add arXiv retrieval for relevant topic categories.
5. Merge candidates by durable identifiers.
6. Screen the merged pool using the defined pipeline.
7. Resolve open-access locations only for shortlisted papers.
8. Defer OpenReview, citation expansion, and Semantic Scholar until the base shortlist is evaluated.

This order tests whether multi-source retrieval improves shortlist value without prematurely building a large provider framework.

## Retrieval Acceptance Rules

The retrieval layer is acceptable when:

- Every candidate records the source and query that found it.
- Lexical and semantic discovery are both represented.
- Relevant preprints are not excluded merely because they lack formal publication metadata.
- DOI-bearing papers are verified against Crossref when possible.
- Provider disagreement is preserved rather than silently flattened.
- Duplicate preprint and published versions normally become one paper identity.
- One provider failure can produce a clearly labeled partial report.
- The system reports search truncation and source coverage limits.
- Full-text retrieval remains explicit and bounded.

## Source Facts Verified

Provider behavior in this section was checked against official OpenAlex, Crossref, arXiv, OpenReview, and Semantic Scholar documentation on 2026-09-21. These are implementation inputs that must be rechecked before coding because API capabilities, access terms, pricing, and limits can change.

## Provider Operational Constraints

These limits are current as of 2026-09-21 and must remain configuration, not permanent product assumptions.

### OpenAlex

- Casual keyless requests are possible, but real usage should support a user-provided API key.
- A free account currently includes a daily API budget; paid usage is optional and pricing may change.
- Search calls consume more budget than simple filtered lookups.
- Semantic search currently allows at most fifty results per query and one request per second.
- Read rate-limit and cost metadata from responses where available.
- Stop optional expansion before exhausting the user's configured budget.
- Never require a paid plan for the first prototype.

### Crossref

- Public anonymous access is available.
- Support the polite pool through an optional user-configured contact email and an identifying user agent.
- Cache DOI lookups and avoid repeated metadata requests.
- Respect response rate and concurrency headers.
- A full-text link in Crossref metadata does not guarantee access rights or successful download.

### arXiv

- Cache identical queries for the day because the API guidance states that results do not need repeated same-day polling.
- Wait at least three seconds between sequential API calls.
- Request small result slices and refine broad queries.
- Preserve first-submission and latest-update dates separately.
- Treat revised versions as updates to the same arXiv work identity.

### OpenReview

- Support both API generations only when required by a target venue.
- Treat submissions, reviews, rebuttals, meta-reviews, and decisions as distinct records linked through OpenReview notes.
- Respect record visibility. Do not assume that non-public review or decision data exists or is accessible.

## Quota Degradation Order

When provider quota or latency is constrained, reduce work in this order:

1. Skip optional citation-neighborhood expansion.
2. Reduce per-query candidate count.
3. Skip secondary semantic queries.
4. Reuse recent cached retrieval results and rerun screening against the new brief.
5. Complete a clearly labeled partial report.

Do not skip DOI verification or hide provider failure merely to report a full-looking shortlist.

## Agent Execution Model

The assistant should initiate scouting, but the scout must run as a detached, persisted job. It should not remain inside the assistant's streamed response.

This separation matters because:

- The user should continue chatting while scouting runs.
- Closing the assistant panel should not erase the job.
- Scheduled watches have no active chat turn.
- Retrieval and screening may take longer than one assistant timeout.
- A durable report needs explicit checkpoints and failure state.
- The current assistant path permits one active streamed turn and holds the vault lock while that turn runs.

## Execution Roles

Use four narrow roles rather than one unconstrained agent:

### Assistant Orchestrator

Responsibilities:

- Understand the user's research intent.
- Draft and revise a scout brief.
- Explain search directions and exclusions.
- Request explicit execution for a manual problem-driven scout.
- Show durable job progress and summarize the final report.

The assistant should not perform the full retrieval and screening inside chat. It should invoke typed workspace actions.

### Job Controller

Responsibilities:

- Snapshot the approved brief or topic watch.
- Create the run identifier and initial status.
- Enforce one active run per brief or watch.
- Apply provider budgets, timeouts, cancellation, and retry rules.
- Persist checkpoints and final state.
- Validate all agent outputs before they enter the report.

The controller owns state transitions. The model does not decide that its own run completed successfully.

### Retrieval Workers

Responsibilities:

- Execute bounded provider queries.
- Cache and record raw provider responses or normalized source records.
- Normalize identifiers and metadata.
- Merge likely duplicates conservatively.
- Resolve abstracts and selected open-access locations.

Retrieval should be deterministic application code. A model may propose queries, but it should not fabricate or directly rewrite provider responses.

### Screening Agent

Responsibilities:

- Read the immutable brief and normalized candidate records.
- Classify relevance.
- State expected reading value.
- Identify assessment evidence and limitations.
- Assign recommend, uncertain, or reject outcomes.
- Propose a coverage-aware shortlist.

The screening agent returns structured assessments. It does not write directly to the vault, create papers, create evidence, or change user decisions.

### Report Assembler

Responsibilities:

- Validate the screening output against the candidate set.
- Reject references to unknown candidates or unsupported fields.
- Enforce shortlist count and evidence requirements.
- Attach source and query provenance.
- Persist the final or partial report.

The assembler should be deterministic application code, not another model call.

## Assistant Tool Boundary

The assistant should receive narrow application tools:

- `propose_scout_brief`.
- `revise_scout_brief`.
- `start_scout_run`.
- `get_scout_run`.
- `cancel_scout_run`.
- `open_scout_report`.
- `save_discovered_paper`.
- `dismiss_discovered_paper`.
- `request_deeper_inspection`.

These names describe the product contract, not final API names.

The tools should accept typed identifiers and validated fields. The assistant should not trigger scouting by writing magic text into chat or editing vault files directly.

For the first version, `start_scout_run` requires an explicit user action on the visible brief card. The assistant may prepare the action, but it must not infer consent from ordinary discussion.

Scheduled topic watches are the exception. Enabling a watch grants standing permission for future scheduled runs within its saved scope and budget.

## Agent Capability Boundary

The scout agent should not receive general shell or unrestricted filesystem access merely to search papers.

Give it only the information and tools required for the run:

- Immutable scout brief or topic-watch snapshot.
- Normalized candidate metadata and available abstracts.
- Known-paper identities and relevant user feedback.
- Bounded source-retrieval tools.
- Structured assessment submission.

Do not expose unrelated vault notes, manuscripts, credentials, or the entire filesystem. Additional research context should be attached deliberately and recorded in `createdFrom` or run context.

This boundary improves reproducibility and prevents an agent from silently changing research records while evaluating candidates.

## Run State Machine

A scout run should use explicit states:

1. `queued`: accepted and waiting to execute.
2. `retrieving`: provider queries are running.
3. `normalizing`: records are being validated, merged, and enriched.
4. `screening`: titles and abstracts are being assessed.
5. `assembling`: shortlist and report validation are running.
6. `completed`: a valid final report was persisted.
7. `partial`: a valid limited report was persisted with explicit missing work.
8. `failed`: no trustworthy report could be produced.
9. `cancelling`: cancellation was requested and active work is stopping.
10. `cancelled`: execution stopped and no further work will begin.
11. `interrupted`: the process ended before a terminal state was persisted.

Progress should report completed units and the active stage, such as `38 of 64 candidates screened`. Do not fabricate a completion percentage when the remaining candidate count can still change.

## Immutable Run Inputs

Every run must snapshot:

- The approved scout brief or topic watch.
- Search directions and generated queries.
- Provider configuration and budgets.
- Screening instructions or prompt version.
- Relevant known-paper identities.
- Relevant user feedback rules.
- Model and provider identifiers used for screening.
- Start time and application version when available.

Editing a brief or watch affects future runs only. Historical reports must remain explainable from their original input snapshot.

## Checkpoints and Persistence

Persist after each meaningful boundary:

- Run creation.
- Query generation.
- Provider response normalization.
- Candidate merge.
- Each completed screening batch.
- Report assembly.
- Terminal status.

Checkpoints should permit inspection and failure diagnosis. The first version does not need exact automatic continuation from every checkpoint.

Persist raw provider payloads only when necessary for reproducibility and permitted by source terms. Otherwise persist normalized records, request parameters, response identifiers, and retrieval timestamps.

## Screening Batches

Screen candidates in bounded batches rather than one large prompt.

Each batch should receive:

- The complete brief.
- A small candidate set.
- Candidate identifiers.
- Titles and abstracts.
- Verified metadata and source labels.
- The same assessment schema and rules.

After batch screening, the report assembler compares all surviving candidates for coverage and redundancy. Batch-local ranking must not determine the final shortlist by itself.

This keeps context bounded while preserving a final global comparison step.

## Validation of Agent Output

Reject or downgrade output that:

- References a candidate identifier not present in the input batch.
- Claims full-text inspection when only an abstract was supplied.
- Invents venue, acceptance, citation, code, dataset, or result information.
- Omits evidence for a relevance assessment.
- Uses an unknown classification or state.
- Exceeds field-size or shortlist limits.
- Produces malformed structured output.

One repair attempt may be made for structurally invalid screening output. Repeated invalid output should mark the affected batch unscreened and the run partial or failed. Do not silently accept prose that bypasses the schema.

## Cancellation Semantics

Cancellation should:

- Stop scheduling new provider requests and screening batches.
- Abort active HTTP and model requests when supported.
- Preserve completed normalized candidates and screening assessments.
- Mark incomplete work clearly.
- Prevent a cancelled run from later changing to completed.
- Leave saved papers and earlier reports unchanged.

A cancelled run may expose completed work for inspection, but it should not publish an unvalidated final shortlist. The user may start a new run from the same immutable brief.

The first version should prefer rerun over complicated checkpoint resume semantics.

## Retry Rules

Retry only failures likely to be transient:

- Network timeout.
- Connection reset.
- HTTP `429` with `Retry-After` support.
- Provider `5xx` responses.
- Temporary model-provider failure.

Initial policy:

- At most two provider retries with bounded exponential backoff.
- One structured-output repair attempt per screening batch.
- No automatic retry for authentication, invalid request, unsupported query, or quota-exhaustion errors.
- No endless retry across application restarts.

Every retry should remain visible in run diagnostics, not the default digest.

## Crash Recovery

On application startup:

- Find runs left in non-terminal states.
- Mark them `interrupted`.
- Preserve all completed checkpoints.
- Offer `Run again` using the same brief snapshot.
- Do not automatically continue network or model work in the first version.

Scheduled watches may perform their normal catch-up decision after interrupted runs are reconciled. They should not duplicate a run for the same watch and scheduled window.

## Concurrency

Initial limits:

- One active scout run per topic watch or manual brief.
- One active screening model call globally by default.
- Small provider-specific request limits.
- Independent retrieval lanes may overlap only within provider limits.
- Assistant chat remains usable while a scout runs.

Global concurrency should be configurable later. The first version should optimize predictable behavior and quota control, not throughput.

## Execution Acceptance Rules

The execution model is acceptable when:

- Scouting continues independently of the assistant response stream.
- A manual run begins only after explicit user action.
- A scheduled watch runs only within its saved permission and budget.
- The brief snapshot and provider queries remain inspectable.
- Every run reaches one durable terminal state.
- Cancellation cannot later produce a completed report.
- Model output is schema-validated before persistence.
- The agent cannot directly create evidence, modify claims, or silently save papers.
- Provider and model failures produce partial or failed reports without invented replacements.
- Restarted applications expose interrupted runs and permit deterministic reruns.

## Persistence Model

Scouting needs durable research artifacts and mutable runtime state. Those concerns should use separate vault locations.

Recommended layout:

```text
research/survey/scouting/
  briefs/
    <brief-id>.md
    <brief-id>.json
  watches/
    <watch-id>.md
    <watch-id>.json
  reports/
    <run-id>.md
    <run-id>.json
runtime/agent-jobs/scouting/
  runs/
    <run-id>.json
```

Optional provider caches are disposable runtime data. They are not canonical research records and do not need inclusion in the first persisted schema.

Use the existing human-readable persistence convention:

- Markdown contains the brief, watch, or report prose a user may inspect outside the app.
- The same-ID JSON sidecar contains structured fields, relationships, status, provenance, and timestamps.
- Runtime checkpoints are structured JSON only because they are execution state rather than authored research prose.

## Collection Responsibilities

### Scout Briefs

A brief is a user-inspectable search plan for a manual problem-driven run.

Persist:

- Durable identifier.
- Question and purpose.
- Scope, exclusions, and constraints.
- Search directions and reasons.
- Screening criteria.
- Recommendation budget.
- Authorship and source context.
- Creation and update timestamps.

Do not mutate a brief after a run starts in a way that changes that historical run. Editing creates the current revision for future runs; each run stores its immutable snapshot.

### Topic Watches

A watch is a persistent scheduled scouting definition.

Persist:

- Durable identifier.
- Topic, purpose, scope, and exclusions.
- Search directions and quality policy.
- Schedule, time zone, and enabled state.
- Recommendation and provider budgets.
- Known-paper seed identities when user supplied.
- Creation and update timestamps.

Runtime fields such as active stage, retry count, and process controller do not belong in the watch record.

### Scout Runs

A run is mutable execution state.

Persist:

- Run identifier.
- Source brief or watch identifier.
- Immutable input snapshot.
- State and active stage.
- Actual generated queries.
- Provider attempts and outcomes.
- Candidate and screening counters.
- Checkpoint references.
- Cancellation and failure details.
- Start, update, and terminal timestamps.
- Final report identifier when available.

Runs remain under `runtime/` because they describe agent execution. They must not be confused with the durable report.

### Scout Reports

A report is the durable research artifact produced by a run.

Persist:

- Identifier equal to the run identifier.
- Immutable brief or watch snapshot.
- Search coverage and source outcomes.
- Recommended and uncertain candidate snapshots.
- Aggregate rejection reasons.
- Limitations and missing evidence.
- Screening model and instruction provenance.
- User decisions associated with each surfaced candidate.
- Creation timestamp and report status.

Using the run identifier as the report identifier removes an unnecessary mapping. A run has at most one final report.

## Candidate Records

Do not add a separate global candidate collection in the first version. Candidate assessments should live inside their scout report.

Each surfaced candidate snapshot contains:

- Run-local candidate identifier.
- Durable external identities.
- Bibliographic metadata snapshot.
- Source-specific provenance.
- Relevance and quality assessment.
- Evidence level.
- Outcome and explanation.
- Optional linked `paperId` after saving.
- Optional user decision.

Cross-report novelty can initially be computed from report identities and existing Papers records. Add a dedicated global discovery index only if report scanning becomes measurably slow or complex.

## Durable Identity Rules

Record IDs and external paper identities are different concepts.

- Record IDs are durable vault filenames and relationship keys.
- External identities include DOI, arXiv ID, PubMed ID, OpenAlex ID, and canonical source URLs.
- Discovering a better external identifier must not regenerate a record ID.
- A paper may hold several external identities.
- One identity may be marked canonical for matching without deleting the others.

Recommended record-ID prefixes:

- `scout-brief-<uuid>`.
- `topic-watch-<uuid>`.
- `scout-run-<uuid>`.

Use the run ID directly for its report files.

For paper matching, normalize identity values but retain their original source values. DOI comparison is case-insensitive. arXiv versions belong to the same work identity but remain visible as versions.

## Saving Discovery Provenance to Papers

Extend the existing Paper record with an optional backward-compatible list of scouting contexts rather than creating duplicate paper records.

Each context should contain:

- Scout report identifier.
- Brief or watch identifier.
- Recommendation reason.
- Matching search directions or queries.
- Assessment evidence level.
- Saved timestamp.
- User-authored or system-authored provenance.

When the paper already exists, append a new context only if the report relationship is new. Do not overwrite existing paper metadata solely because a discovery provider returned another value. Conflicts should be reviewed or resolved by field-specific normalization.

The scouting context is not evidence. Evidence remains a separate user-mediated record linked from actual inspected content.

## Persistence Boundary

The first implementation should evolve the existing dedicated literature store into a scout store rather than immediately adding these collections to the full `VaultSnapshot` synchronization path.

Reason:

- Current literature jobs, runs, and discovery records already persist outside `MD_COLLECTIONS`.
- Scout jobs require incremental checkpoint writes.
- Full vault writes delete absent entities and are therefore data-loss-sensitive.
- A detached worker should not rewrite the complete workspace snapshot after each checkpoint.

The scout endpoint must still use the resolved local vault, the vault lock for atomic state transitions, local-only request checks, and atomic file replacement.

Later integration into `VaultSnapshot` is optional. It is justified only if workspace-wide state consumers need synchronous access to all scout objects. If added, server mappings, client parsing, context load/save, deletion semantics, and round-trip tests must change together.

## Legacy Migration

Existing data must remain readable:

```text
runtime/agent-jobs/literature/jobs/
runtime/agent-jobs/literature/runs/
research/survey/discovery/
```

Migration policy:

1. Detect legacy records on scout-store load.
2. Normalize them into new in-memory representations.
3. Copy them atomically into new paths only when a corresponding new record does not exist.
4. Preserve original IDs whenever they satisfy the durable-ID constraints.
5. Write a migration marker only after every copied record has been reread and validated.
6. Leave legacy files untouched during the first migration version.
7. Prefer new records on later loads while ignoring migrated legacy duplicates.
8. Never delete legacy files automatically.

Field mapping for legacy jobs:

- `name` remains the watch name.
- `brief` becomes the imported topic and purpose text without semantic rewriting.
- `queries` become search directions with the reason `Imported legacy query`.
- `dailyTime`, `enabled`, and scheduling timestamps remain preserved.
- `expand` becomes a recorded legacy query-expansion preference.
- Missing scope, exclusions, quality policy, and recency policy remain explicitly unspecified.

Field mapping for legacy discovery results:

- Preserve title, authors, year, DOI, URL, abstract, source, queries, and timestamps.
- Preserve legacy job and run identifiers.
- Mark assessment state as `unscreened`.
- Do not retroactively label a legacy search result as recommended, uncertain, or rejected.

Field mapping for legacy runs:

- Preserve terminal completed or failed status and result count.
- Convert stale running records to `interrupted` on startup.
- Preserve errors and timestamps.
- Do not invent report records for runs that never produced screened reports.

## Data Retention

Default retention:

- Briefs, watches, reports, decisions, and saved-paper provenance persist until explicit deletion.
- Run diagnostics persist with their report.
- Raw provider responses and cache entries may expire.
- Cancelled, failed, and interrupted runs persist because they explain missing or partial outcomes.

Deletion rules:

- Deleting a watch stops future runs but does not delete reports or saved papers.
- Deleting a brief does not delete historical run snapshots or reports.
- Deleting a report removes only that report after explicit confirmation; linked saved papers remain.
- Deleting a saved paper does not silently erase its scout report.
- Bulk cleanup of caches must never remove canonical reports or decisions.

## Privacy and Security

Paper scouting sends information to external search and model providers. The product must make that boundary visible.

### Data Minimization

External search providers receive only the query fields needed for retrieval.

The screening model receives only:

- The immutable brief or relevant watch fields.
- Candidate metadata and available abstracts.
- Narrow known-paper identities or feedback needed for novelty decisions.

Do not send unrelated notes, manuscript text, claims, evidence, tasks, chat history, or the whole vault.

The user should be able to inspect the scout brief before a manual external request begins. Sensitive project wording may be replaced with broader search concepts while the private purpose remains local.

### Credential Handling

- Store provider keys outside the research vault.
- Prefer environment variables or a local application-secret store.
- Use restrictive file permissions for any local secret file.
- Never write credentials into reports, run diagnostics, chat transcripts, URLs, or logs.
- Redact authorization headers and sensitive query parameters from errors.
- Permit providers that require no key when their usage terms allow it.
- Never enable paid usage automatically.

### Network Boundary

- Keep scout endpoints loopback-only and same-origin.
- Use an allowlist of provider hosts.
- Construct provider URLs in application code; do not accept arbitrary agent-supplied URLs.
- Restrict redirects and validate the final protocol and host.
- Set request timeouts and response-size limits.
- Reject unsafe URL schemes.
- Do not expose a generic server-side fetch proxy.

### Full-Text Handling

- Retrieve full text only after explicit deeper-inspection intent or a tightly bounded approved rule.
- Verify content type and enforce download-size limits.
- Treat PDF and HTML contents as untrusted input.
- Do not execute embedded files, scripts, macros, or links.
- Do not allow downloaded content to issue agent instructions.
- Record source URL, retrieval time, and document hash when a document is inspected.
- Respect access rights and provider terms.

Paper text is evidence to analyze, not trusted instructions. Prompt-injection-like text inside a paper must not change agent tools, scope, or system rules.

### Logging

Logs should contain run IDs, stages, provider status, latency, and redacted errors. Avoid logging complete abstracts or sensitive search briefs by default.

Reports contain the user-facing research record. Operational logs should not become a second uncontrolled copy of research content.

## Cost and Attention Budgets

The system has two budgets:

- Computational budget: provider calls, model tokens, downloads, and elapsed work.
- Human attention budget: papers presented to the user.

Default limits:

- Manual scout: at most five recommendations.
- Daily digest: at most three recommendations.
- One global screening call active at a time.
- Bounded candidate and citation-expansion limits defined earlier.
- No automatic paid-provider fallback.
- No automatic full-text analysis for every candidate.

Before a manual run, show a qualitative estimate such as `small`, `standard`, or `expanded` based on retrieval lanes and deeper inspection. Avoid fake currency estimates unless actual provider pricing and token accounting are available.

A scheduled watch should have a per-run provider and screening budget. Exhausting a budget produces a partial report or successful empty digest, not hidden paid work.

## Notification Policy

Daily scouting should not become an attention-demanding inbox.

Initial behavior:

- Store one digest per watch run.
- Show a passive unread count in Discovery.
- Show one assistant-panel notice when the app is opened after a new digest.
- Do not produce operating-system notifications by default.
- Do not notify for uncertain candidates alone unless the user opts in.
- Group catch-up results into one digest.
- Let the user mark a digest reviewed without saving or dismissing every candidate.

## Accessibility and Interaction Requirements

- Every paper action must be keyboard reachable.
- Report cards need explicit accessible names for save, dismiss, compare, inspect, and external-source actions.
- Progress and completion changes need non-disruptive status announcements.
- Cancellation must remain available while a run is active.
- Color must not be the only signal for relevance, confidence, state, or failure.
- Dense metadata must wrap or scroll safely at narrow widths.
- Focus should move predictably when opening a report, dialog, or comparison view.
- `Escape` should close transient details without cancelling an active run.
- Existing global keyboard behavior must remain intact.
- Both themes and configurable base font size must remain supported.

## Implementation Phases

### Phase 1: Contracts and Safe Storage

Deliver:

- Type definitions for briefs, watches, runs, reports, assessments, identities, and decisions.
- Scout-store parsing and validation.
- Markdown and JSON sidecar persistence.
- Atomic writes and local-only endpoints.
- Legacy read and copy migration.
- Round-trip and migration tests.

No new UI is required beyond developer-visible fixtures or endpoint tests.

### Phase 2: Problem-Driven Retrieval

Deliver:

- Manual brief execution.
- OpenAlex lexical retrieval.
- One OpenAlex semantic lane.
- Focused arXiv retrieval.
- Crossref DOI verification.
- Identifier merge and provenance.
- Provider budgets, cancellation, retries, and partial runs.

A deterministic fixture mode should make retrieval tests independent of live provider availability.

### Phase 3: Screening and Report Assembly

Deliver:

- Bounded screening batches.
- Strict structured-output validation.
- Relevance, value, confidence, and limitation assessments.
- Coverage-aware shortlist assembly.
- Durable Markdown and JSON reports.
- Failure, malformed-output, missing-abstract, and cancellation tests.

### Phase 4: Discovery Workflow

Deliver:

- Full report display in Discovery.
- Recommended, uncertain, and rejection-summary sections.
- Abstract, provenance, limitations, and source inspection.
- Save, dismiss, compare, and deeper-inspection actions.
- Existing-paper deduplication and appended scouting context.
- Desktop, narrow viewport, light theme, dark theme, keyboard, and dialog QA.

### Phase 5: Assistant Invocation

Deliver:

- Assistant tools for proposing, revising, starting, inspecting, and cancelling scouts.
- Visible brief card with explicit `Run scout` action.
- Detached progress display.
- Final summary linking to the durable report.
- Continued assistant usability while a scout runs.

Do not remove the existing form yet.

### Phase 6: Topic Watches

Deliver:

- Watch creation from assistant or Discovery.
- Daily/manual cadence, local time, and time zone.
- Local-process scheduling with one catch-up run.
- Novelty and repetition rules.
- Zero-to-three-paper digest.
- Pause, resume, run now, edit, and delete behavior.
- Empty-digest, missed-run, duplicate-window, and restart tests.

### Phase 7: Consolidation

After real use confirms parity:

- Remove or reduce redundant manual query controls.
- Preserve an advanced brief editor for users who want direct control.
- Review whether Semantic Scholar, OpenReview, citation expansion, or OS-level scheduling solves observed gaps.
- Review whether report scanning requires a discovery index.
- Delete legacy files only through a separate explicit migration-cleanup operation, if ever needed.

## Validation Matrix

### Persistence

- Create, read, update, and delete a brief.
- Preserve multiline Markdown exactly.
- Create and update a watch without changing its ID.
- Persist every run state and terminal transition.
- Preserve reports when deleting watches.
- Append discovery context to an existing paper without duplication.
- Reject malformed sidecars without overwriting valid workspace state.

### Migration

- Load a vault with only legacy jobs, runs, and results.
- Preserve IDs and timestamps.
- Preserve legacy files.
- Mark legacy results unscreened.
- Convert stale running jobs to interrupted runs.
- Repeat migration without creating duplicates.
- Prefer an existing new record over its legacy counterpart.

### Retrieval

- Narrow exact terminology.
- Broad semantic terminology.
- Ambiguous cross-field terminology.
- Missing abstract.
- DOI disagreement across sources.
- Preprint and published-version merge.
- Same title with different works.
- Provider timeout, `429`, `5xx`, invalid response, and quota exhaustion.
- One failed provider with a valid partial report.
- Search truncation disclosure.

### Screening

- Direct, supporting, background, and irrelevant examples.
- Highly relevant paper with low quality confidence.
- Prestigious but indirect paper.
- Conflicting or corrective paper.
- Model output referencing an unknown candidate.
- Unsupported full-text claim.
- Malformed structured output and one repair attempt.
- More passing candidates than the shortlist budget.
- No candidate passing the threshold.

### Execution

- Cancel during retrieval.
- Cancel during screening.
- Prevent cancelled-to-completed transition.
- Prevent concurrent runs for one brief or watch.
- Continue assistant chat during scouting.
- Restart with a non-terminal run and mark it interrupted.
- Rerun from the immutable snapshot.

### User Workflow

- Save a new paper.
- Save an already-existing paper.
- Dismiss as irrelevant, already known, too similar, poor quality, or not useful now.
- Re-surface a paper for a materially different brief.
- Compare candidates with unknown fields preserved.
- Request deeper inspection when full text is available and unavailable.
- Confirm no recommendation automatically becomes evidence.

### Daily Watches

- Scheduled run while the app is active.
- One catch-up run after a missed schedule.
- Several missed days without backlog creation.
- Empty successful digest.
- Same paper found on consecutive days.
- Publication-status update without false novelty.
- Paused and deleted watch behavior.
- Explicit time-zone behavior around daylight-saving changes where applicable.

### UI and Accessibility

- Desktop and narrow viewport.
- Light and dark themes.
- Configured font-size changes.
- Keyboard-only brief, report, save, dismiss, compare, and cancel flows.
- Screen-reader labels and status announcements.
- Focus restoration after dialogs and report transitions.
- No regression to `Cmd/Ctrl+J`, `/`, or `Escape` behavior.

## Product Acceptance Gate

The first problem-driven release is ready only when a user can:

1. Discuss a real research problem in the assistant panel.
2. Inspect and revise a generated scout brief.
3. Explicitly start a detached scout.
4. Continue using the assistant while it runs.
5. Open a durable report containing screened, explained, traceable candidates.
6. See uncertainty, missing evidence, and partial source failures.
7. Save one paper without creating a duplicate.
8. Open that paper in the existing Papers reading workflow.
9. Confirm that no claim or evidence was created automatically.
10. Restart the app and find the brief, run, report, decision, and saved-paper provenance intact.

The daily-scout release is ready only after the problem-driven gate passes and scheduled runs additionally satisfy novelty, empty-digest, catch-up, and repetition tests.

## Resolved Product Decisions

The initial open questions are resolved as follows:

1. `Worth reading` means that reading the paper has an explicit expected value for the brief or watch, supported by available evidence.
2. Manual runs return at most five recommendations; daily runs return at most three.
3. Initial screening uses title and abstract. Full-text inspection is separate and explicit.
4. Manual problem-driven scouting requires explicit approval of a visible brief before execution.
5. Daily scouting uses a mixed policy: recent work first, with foundational or corrective work when it offers greater value.
6. Author and venue reputation are supporting signals, never mandatory quality gates.
7. Incomplete metadata lowers confidence or moves a paper to uncertain; it is not silently filled by inference.
8. Save, dismissal reasons, already-known status, reading state, citation use, and explicit feedback may influence future deterministic selection.
9. Initial schedules run only while the local application process is active, with at most one catch-up run.
10. Existing literature controls remain until assistant-driven scouting reaches behavioral parity. Redundant controls are removed only in consolidation.

Additional decisions:

- Discovery reports live outside chat.
- Recommendations do not become papers until the user saves them.
- Saved papers do not become evidence automatically.
- Relevance and quality confidence remain separate.
- Numeric quality scores are deferred.
- Empty shortlists and empty daily digests are valid outcomes.
- The first source stack is OpenAlex, arXiv, and Crossref.
- OpenReview, Semantic Scholar, broad citation expansion, automatic PDF analysis, opaque ranking models, paid fallback, and OS-level scheduling are deferred.

## Remaining Implementation Decisions

These questions should be answered during technical design because they depend on concrete APIs or measured behavior:

- Whether the current Codex SDK can enforce the required restricted scout-tool boundary. If not, screening needs a narrower model invocation path.
- Exact TypeScript field names and size limits after fixture-based schema tests.
- Exact OpenAlex and model budgets after measuring three representative scout runs.
- Screening batch size after observing abstract lengths and provider limits.
- Whether a separate report index becomes necessary after realistic data volume.
- Which venues justify an OpenReview adapter based on actual user topics.

None of these decisions block starting Phase 1.

## Specification Status

The product-discovery specification is complete enough to begin technical design and implementation planning.

The recommended implementation target is the problem-driven vertical slice through Phase 5. Daily topic watches should follow only after real shortlist quality and user handoff are validated.
