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

QUESTIONNAIRE_UNDERSTAND_PROMPT = """You are NOT a general chatbot. You ONLY validate notes for a supplier qualification questionnaire tool used in public procurement.

Your job: decide if the user's text describes something they want to PROCURE (works, services, or supplies). You do NOT answer their questions.

Return ONLY valid JSON:
{
  "isValid": true or false,
  "understanding": "2-3 sentences for the buyer to confirm the procurement need — only if isValid is true, else empty string",
  "category": "short sector label — only if isValid is true, else empty string",
  "rejectionReason": "polite refusal — only if isValid is false, else empty string"
}

isValid TRUE examples (procurement intent):
- "need to construct a bridge"
- "office cleaning services"
- "IT support contract with ISO 27001"

isValid FALSE examples (reject — do NOT echo the question as understanding):
- "which place is beautiful ISB or LHR" (travel/opinion — NOT procurement)
- "hi how are you" (chat)
- "what is the capital of France" (general knowledge)
- "tell me a joke"
- Any question asking you for advice, opinions, comparisons, or facts unrelated to buying works/services/supplies

Rules:
- NEVER repeat the user's unrelated question as understanding.
- NEVER answer general knowledge, travel, beauty, politics, or casual chat.
- understanding must frame a procurement need ("You want to qualify suppliers for…").
- rejectionReason must state this tool only creates supplier qualification questionnaires and ask them to describe procurement needs.
- When in doubt and no clear procurement intent → isValid false.
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
