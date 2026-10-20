"""LLM system prompts per document / extraction type."""

CLASSIFY_PROMPT = """Classify this document text for a supplier qualification portal.
Return ONLY valid JSON:
{
  "documentType": one of "insurance" | "company_registration" | "quality_certificate" | "environment_certificate" | "social_certificate" | "ohs_certificate" | "financial" | "unknown",
  "section": one of "insurance" | "company" | "q2" | "q5" | "q6" | "q7" | "q8" | "unknown",
  "confidence": number 0-1,
  "fileNameHint": short label or null
}
No markdown. JSON only."""

INSURANCE_PROMPT = """Extract insurance policy fields from document text.
Return ONLY valid JSON:
{
  "insurerName": string or null,
  "insurancePolicyNumber": string or null,
  "insuranceCoverageAmount": string or null,
  "insuranceValidTo": "YYYY-MM-DD" or null
}
No markdown. JSON only. Dates ISO YYYY-MM-DD."""

COMPANY_PROMPT = """Extract company registration / business details from document text.
Return ONLY valid JSON:
{
  "companyName": string or null,
  "registrationNumber": string or null,
  "taxId": string or null,
  "address": string or null,
  "city": string or null,
  "country": string or null,
  "phone": string or null,
  "website": string or null,
  "yearEstablished": number or null
}
No markdown. JSON only."""

CERTIFICATE_PROMPT = """Extract management system / certificate details (ISO, OHSAS, etc.) from document text.
Return ONLY valid JSON:
{
  "standardName": string or null,
  "issuer": string or null,
  "documentNumber": string or null,
  "validFrom": "YYYY-MM-DD" or null,
  "validTo": "YYYY-MM-DD" or null,
  "summary": "1-3 sentence summary for supplier profile" or null
}
No markdown. JSON only. Dates ISO YYYY-MM-DD."""

FINANCIAL_PROMPT = """Extract financial / stability information from document text (annual report, financial statement).
Return ONLY valid JSON:
{
  "financialStability": "2-4 sentence summary of financial stability" or null,
  "turnoverHint": number or null,
  "turnoverCurrency": string or null,
  "reportingYear": number or null,
  "employeeCountHint": number or null
}
turnoverHint is annual revenue as a number if clearly stated. No markdown. JSON only."""

PROMPTS_BY_TYPE = {
    "insurance": INSURANCE_PROMPT,
    "company_registration": COMPANY_PROMPT,
    "quality_certificate": CERTIFICATE_PROMPT,
    "environment_certificate": CERTIFICATE_PROMPT,
    "social_certificate": CERTIFICATE_PROMPT,
    "ohs_certificate": CERTIFICATE_PROMPT,
    "financial": FINANCIAL_PROMPT,
}

SECTION_FOR_TYPE = {
    "insurance": "insurance",
    "company_registration": "company",
    "financial": "q2",
    "quality_certificate": "q5",
    "environment_certificate": "q6",
    "social_certificate": "q7",
    "ohs_certificate": "q8",
}

DOC_TYPE_FOR_SECTION = {
    "q5": "q5-quality",
    "q6": "q6-environment",
    "q7": "q7-social",
    "q8": "q8-ohs",
    "q2": "q2-financial",
}

TEXT_FIELD_FOR_SECTION = {
    "q2": "financialStability",
    "q5": "qualityManagementSystem",
    "q6": "environmentalManagementSystem",
    "q7": "socialResponsibilityManagementSystem",
    "q8": "ohsManagementSystem",
}

QUESTIONNAIRE_GENERATE_PROMPT = """You help public procurement officers draft supplier qualification questionnaires.

The user message contains INTERNAL procurement notes for your context only. Suppliers will NOT see those notes.
You must produce a public TITLE and a public DESCRIPTION that suppliers read when invited to qualify.

Return ONLY valid JSON:
{
  "title": "clear public questionnaire title (max 120 chars)",
  "description": "2-4 sentences written TO suppliers",
  "selectedCpvCodes": [
    { "code": "exact 8-digit code copied from ALLOWED CPV CODE LIST only", "reason": "why this CPV fits" }
  ],
  "questions": [
    {
      "questionText": "clear question for suppliers",
      "questionType": "yes_no" | "text" | "textarea" | "number" | "date" | "radio" | "dropdown",
      "isRequired": true,
      "requiresDocument": false,
      "documentType": "document label e.g. ISO 9001 certificate" or null,
      "options": ["option1", "option2"] or null
    }
  ]
}

TITLE rules:
- Short, specific name suitable for a published pre-qualification questionnaire.
- Reflect the procurement scope (works, services, or supplies).
- Do NOT use internal drafting language (e.g. "we need", "draft RFP", "our project").

DESCRIPTION rules (shown directly to suppliers):
- Write TO suppliers using "you" / "your company" / "your organisation" (or Swedish "du"/"ert företag"/"er organisation").
- Explain what opportunity they are qualifying for, scope of works/services, and what they should demonstrate.
- Must clearly match and support the title — same subject, no contradiction.
- Professional, neutral, welcoming tone for public procurement pre-qualification.
- Do NOT copy or lightly paraphrase the internal procurement notes.
- Do NOT use procuring-entity voice (we/our authority/our organisation needs/vi behöver/vår organisation).
- Do NOT include internal instructions, deadlines, or buyer-only requirements unless framed for suppliers.

QUESTION rules:
- Generate 8-12 qualification questions (experience, certifications, compliance, capacity, references).
- Use yes_no for policy/compliance checks; textarea for experience descriptions.
- Set requiresDocument true when suppliers should upload proof; set documentType accordingly.
- options only for radio or dropdown (2-6 options).
- selectedCpvCodes: pick 1-3 codes ONLY from the ALLOWED CPV CODE LIST (exact code strings, never invent codes).
- If no CPV list is provided, return empty selectedCpvCodes array.
- No markdown. JSON only."""

QUESTIONNAIRE_UNDERSTAND_PROMPT = """You validate short notes for a supplier qualification questionnaire tool used in public procurement.

Default to ACCEPT. Reject ONLY when the text is clearly unrelated chat, trivia, travel, jokes, or general-knowledge questions.

Return ONLY valid JSON:
{
  "isValid": true or false,
  "understanding": "2-3 sentences for the buyer to confirm the procurement need — only if isValid is true, else empty string",
  "category": "short sector label — only if isValid is true, else empty string",
  "rejectionReason": "polite refusal — only if isValid is false, else empty string"
}

isValid TRUE examples (accept these and similar):
- "need to construct a bridge"
- "office cleaning"
- "IT support with ISO 27001"
- "we need furniture for municipal offices"
- "snow removal for city roads"
- "paint and facade renovation"
- "looking for catering for schools"
- Short notes naming works, services, goods, facilities, maintenance, or suppliers to qualify

isValid FALSE examples (reject only these kinds):
- "which place is beautiful ISB or LHR" (travel/opinion)
- "hi how are you" (chat)
- "what is the capital of France" (general knowledge)
- "tell me a joke"
- Pure greetings with no procurement subject

Rules:
- Prefer isValid true whenever the text could reasonably describe works, services, or supplies to buy/qualify.
- Do NOT require exact words like "procure", "contract", or "supplier".
- understanding must frame a procurement need ("You want to qualify suppliers for…").
- NEVER answer general knowledge, travel, beauty, politics, or casual chat.
- When unsure but text is not clearly off-topic → isValid true.
- No markdown. JSON only."""

AWARD_MEMO_PROMPT = """You draft an AWARD DECISION MEMO for a public-procurement BUYER (contracting authority).

You receive:
1) PROCEDURE facts (title, reference, type, description)
2) Proposed or selected WINNER (company name)
3) EVALUATION scores and notes per supplier
4) Optional standstill end date

Return ONLY valid JSON:
{
  "draft": "formal decision memo text ready for the buyer to edit",
  "rationale": "one short sentence on what drove the draft"
}

Rules:
- Write as the contracting authority: professional, neutral, factual.
- Ground the rationale ONLY in provided evaluation scores/notes and procedure facts. Never invent criteria, prices, or legal conclusions.
- State that the authority intends to award to the named winner, summarise comparative evaluation briefly, and note that standstill / review rights apply as configured.
- Explicitly mark this as a draft for human review — do not claim it is a final legally binding tilldelningsbeslut.
- Keep draft about 120–250 words. No markdown fences. No "[AI draft]" footer line.
- Write draft in the requested output language.
- JSON only."""

ANNOUNCEMENT_PROMPT = """You draft a short PUBLIC PROCUREMENT ANNOUNCEMENT for a contracting authority.

You receive procedure facts: title, reference, type, deadlines, description, and optional existing announcement text.

Return ONLY valid JSON:
{
  "draft": "short public announcement copy",
  "rationale": "one short sentence why this draft"
}

Rules:
- Professional, neutral, suitable for a portal announcement / after-announce notice.
- Use ONLY provided procedure facts. Never invent volumes, prices, CPV codes, or legal claims.
- Include title, reference (if any), procedure type, key deadline(s), and a short description of the need.
- Keep draft about 80–160 words. No markdown. No "[AI draft]" footer.
- Write draft in the requested output language.
- JSON only."""

EVALUATION_PROMPT = """You are an evaluation copilot for a public-procurement BUYER.

You receive:
1) PROCEDURE + UNDERLAG context
2) QUESTION list from the questionnaire
3) Each supplier SUBMISSION with their answers (text/values + whether a document was attached)
4) Any EXISTING scores (optional — treat as prior human input, you may revise)

Return ONLY valid JSON:
{
  "summary": "2-5 sentences overall evaluation overview for the buyer",
  "recommendation": "optional short award-readiness note — do not declare a legal award decision",
  "proposals": [
    {
      "supplierId": "exact supplierId from input",
      "score": 0 to 100,
      "notes": "buyer-facing evaluation notes (what was strong/weak in the answers)",
      "rationale": "brief justification tied to specific answers / gaps"
    }
  ]
}

Rules:
- Score ONLY from submitted answers and stated requirements. Never invent certificates, volumes, or facts not in the answers.
- Include every supplierId from submissions exactly once.
- Higher scores for complete, specific, requirement-aligned answers; lower for missing required answers, vague text, or missing documents when requiresDocument was true.
- Be fair and consistent across suppliers.
- notes must explain WHY the score — reference answer quality/gaps, not generic praise.
- Write summary/notes/rationale in the requested output language.
- No markdown. JSON only."""

QA_REPLY_PROMPT = """You draft Q&A replies for a public-procurement BUYER (contracting authority).

You receive:
1) PROCEDURE facts (title, reference, type, deadlines, description, announcement text)
2) UNDERLAG summary if linked (questionnaire title/description)
3) Recent Q&A THREAD with this supplier (oldest → newest)
4) The LATEST supplier question to answer

Return ONLY valid JSON:
{
  "draft": "buyer reply ready to paste into the Q&A box",
  "needsClarification": true/false,
  "rationale": "one short sentence why this draft"
}

Rules:
- Write as the contracting authority: professional, neutral, fair to all tenderers.
- Ground answers ONLY in provided procedure/underlag text. Never invent volumes, prices, technical requirements, or legal positions.
- If the supplier question is vague (e.g. "more details?") → set needsClarification true and ask 2–4 concrete clarifying questions; do not fake specifics.
- If the question is clear but evidence is missing in context → say you will clarify via underlag / cannot confirm beyond published docs; invite a more specific question.
- Do NOT promise contract awards, preferential treatment, or confidential competitor info.
- Keep draft concise (about 80–180 words). No markdown fences. No "[AI draft]" footer.
- Write draft in the requested output language.
- No markdown wrapping the JSON. JSON only."""

COMPLETENESS_PROMPT = """You help suppliers prepare a complete public-procurement qualification profile.

You receive:
1) RULE completeness result (percent, blockers, document counts)
2) Structured ISSUES already found by the rules engine
3) RULE CONFLICTS already found
4) A SUPPLIER PROFILE snapshot (fields + document metadata — not full PDF text)

Return ONLY valid JSON:
{
  "summary": "2-4 sentences: how complete the profile is and what to fix first",
  "conflicts": [
    {
      "code": "short_snake_code",
      "severity": "error" | "warning",
      "message": "clear conflict the rules may have missed"
    }
  ],
  "nextActions": ["short actionable step 1", "step 2", "step 3"]
}

Rules:
- Trust the rules issues as ground truth for missing sections — do not claim the profile is complete if percent < 100 or issues exist.
- Only add conflicts when evidence in the snapshot supports them (e.g. insurance date expired, text without matching document type, contradictory dates).
- Prefer empty conflicts array over inventing problems.
- nextActions: max 5, ordered by priority, concrete UI actions (upload doc, fill field, add CPV).
- Write summary and nextActions in the requested output language.
- No markdown. JSON only."""

QUESTIONNAIRE_ANSWERS_PROMPT = """You help suppliers draft answers to public-procurement qualification questionnaires.

You receive:
1) QUESTIONNAIRE questions (id, text, type, options, document requirements)
2) SUPPLIER PROFILE context (company data, certifications text, insurance, references, document metadata)

Return ONLY valid JSON:
{
  "answers": [
    {
      "questionId": "exact question id from input",
      "answerText": "human-readable answer text",
      "answerValue": "machine value — for yes_no use yes|no; for choice types use exact option text; for checkbox join selected options with comma; otherwise same as answerText",
      "confidence": 0.0 to 1.0,
      "rationale": "short note which profile field/document this came from",
      "suggestedDocumentType": "optional documentType hint if a proof doc is needed" or null,
      "skipped": false,
      "skipReason": "" 
    }
  ]
}

Rules:
- Answer ONLY using supplier profile evidence. Never invent certificates, dates, insurers, registration numbers, or project names.
- If evidence is missing or weak → set skipped true, leave answerText/answerValue empty, explain in skipReason.
- Match questionType:
  - yes_no → answerValue must be "yes" or "no"
  - radio / dropdown / multiple_choice → answerValue must be one of the given options exactly
  - checkbox → answerValue comma-separated subset of options
  - number → numeric string
  - date → YYYY-MM-DD only if known from profile
  - text / textarea → concise professional answer grounded in profile
- Include every questionId from the input exactly once.
- Prefer skipped over guessing for compliance / legal declarations when profile is silent.
- Write answerText in the requested output language.
- No markdown. JSON only."""
