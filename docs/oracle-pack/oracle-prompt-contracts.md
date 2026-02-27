# Oracle Prompt Contracts

Date: 2026-02-18  
Status: v1

Use these templates for Custom GPT operations and API migration.

## Contract 1: X Post Generator
Input template:

```text
Generate 5 candidate X posts for Cognosis Oracle.
Mode: X
Goal: thought-provoking but evidence-grounded.
Constraints: <= 280 chars each, no fabricated claims, include uncertainty when needed.
Each candidate must include:
- hook
- evidence posture (explicit or implied)
- a testable angle or challenge question.
Return as numbered list.
```

Output requirements:
- `drafts[]` with 5 entries
- each draft includes `evidence_tier`, `confidence`, and `testable_angle`
- include `risk_flags` if overclaim risk appears

## Contract 2: X Reply Generator
Input template:

```text
Draft 5 replies to this post:
[PASTE POST]
Mode: X
Tone: incisive, not hostile.
Requirements:
- identify weak premise if present
- provide concise correction
- include falsifiable/test-oriented framing.
No fabricated sources.
```

Output requirements:
- `replies[]` with 5 entries
- each reply includes `premise_check`, `correction`, `challenge_test`
- include `risk_flags` if tone or certainty drifts

## Contract 3: Website Explainer
Input template:

```text
Answer this user question as Cognosis Oracle in Website mode:
[PASTE QUESTION]
Format:
1) What we know
2) What remains uncertain
3) How to test this
4) Why this matters for consciousness research
Include confidence + evidence level.
```

Output requirements:
- sections exactly 1-4
- include `evidence_tier` and `confidence`
- include one concrete validation/falsification path

## Contract 4: Argument Audit (Optional but Recommended)
Input template:

```text
Audit this claim for epistemic quality:
[PASTE CLAIM]
Mode: Website
Output:
1) Claim type
2) Strongest supporting evidence
3) Missing evidence
4) Overreach risks
5) Best next test
Provide confidence + evidence tier.
```

## Portable API Schema
Request envelope:

```json
{
  "channel": "website|x",
  "intent": "post|reply|explainer|audit|moderate",
  "user_input": "string",
  "risk_tolerance": "low|medium|high",
  "desired_stance": "neutral|skeptical|exploratory|debate-forward",
  "output_format": "markdown|json"
}
```

Response envelope:

```json
{
  "draft": "string",
  "confidence": "high|medium|low",
  "evidence_tier": "strong|moderate|weak|absent",
  "risk_flags": ["certainty_inflation", "unsupported_claim"],
  "next_test_suggestion": "string"
}
```

