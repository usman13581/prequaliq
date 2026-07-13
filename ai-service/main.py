"""
PrequaliQ AI extraction API — runs on GPU with local Ollama.
Interactive docs: GET /docs and GET /redoc
"""
import json
import os
import re
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from prompts import (
    CLASSIFY_PROMPT,
    PROMPTS_BY_TYPE,
    SECTION_FOR_TYPE,
    QUESTIONNAIRE_GENERATE_PROMPT,
    QUESTIONNAIRE_UNDERSTAND_PROMPT,
)

load_dotenv()

API_KEY = os.getenv("AI_API_KEY", "")
OLLAMA_BASE = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

app = FastAPI(
    title="PrequaliQ AI Service",
    version="2.0.0",
    description="Self-hosted document extraction for supplier qualification. All LLM calls stay on this GPU.",
)

MAX_TEXT_CHARS = 12000

ENDPOINTS_CATALOG = [
    {"method": "GET", "path": "/health", "auth": False, "description": "Ollama status"},
    {"method": "GET", "path": "/endpoints", "auth": False, "description": "This catalog"},
    {"method": "GET", "path": "/docs", "auth": False, "description": "Swagger UI"},
    {"method": "GET", "path": "/redoc", "auth": False, "description": "ReDoc API reference"},
    {"method": "POST", "path": "/extract/classify", "auth": True, "description": "Classify document type and profile section"},
    {"method": "POST", "path": "/extract/insurance", "auth": True, "description": "Insurance fields"},
    {"method": "POST", "path": "/extract/company", "auth": True, "description": "Company registration fields"},
    {"method": "POST", "path": "/extract/certificate", "auth": True, "description": "ISO / management certificate"},
    {"method": "POST", "path": "/extract/financial", "auth": True, "description": "Financial statement summary"},
    {"method": "POST", "path": "/extract/auto", "auth": True, "description": "Classify then extract in one call"},
    {"method": "POST", "path": "/generate/questionnaire", "auth": True, "description": "Generate questionnaire draft from procurement description"},
    {"method": "POST", "path": "/generate/questionnaire/understand", "auth": True, "description": "Validate procurement intent and summarize for user confirmation"},
]


class TextRequest(BaseModel):
    text: str = Field(..., min_length=20, max_length=MAX_TEXT_CHARS)
    language: Optional[str] = Field(default="en")
    fileName: Optional[str] = Field(default=None)


class InsuranceResponse(BaseModel):
    insurerName: Optional[str] = None
    insurancePolicyNumber: Optional[str] = None
    insuranceCoverageAmount: Optional[str] = None
    insuranceValidTo: Optional[str] = None
    raw: Optional[dict[str, Any]] = None


class ClassifyResponse(BaseModel):
    documentType: str
    section: str
    confidence: float
    fileNameHint: Optional[str] = None
    raw: Optional[dict[str, Any]] = None


class AutoExtractResponse(BaseModel):
    documentType: str
    section: str
    confidence: float
    fields: dict[str, Any]
    raw: Optional[dict[str, Any]] = None


class QuestionnaireGenerateRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=4000)
    language: Optional[str] = Field(default="en")
    cpvCandidates: Optional[list[dict[str, str]]] = Field(default=None)


class QuestionnaireUnderstandRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=4000)
    language: Optional[str] = Field(default="en")


class QuestionnaireUnderstandResponse(BaseModel):
    isValid: bool
    understanding: str
    category: str
    rejectionReason: str
    raw: Optional[dict[str, Any]] = None


class QuestionnaireGenerateResponse(BaseModel):
    title: str
    description: str
    selectedCpvCodes: list[dict[str, Any]]
    cpvCodeHints: list[dict[str, Any]]
    searchKeywords: list[str]
    questions: list[dict[str, Any]]
    raw: Optional[dict[str, Any]] = None


def verify_api_key(x_api_key: Optional[str]) -> None:
    if not API_KEY:
        raise HTTPException(status_code=503, detail="AI_API_KEY not configured on server")
    if not x_api_key or x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


def parse_json_from_llm(content: str) -> dict[str, Any]:
    text = content.strip()
    if "```" in text:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if match:
            text = match.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object in model response")
    return json.loads(text[start : end + 1])


async def call_ollama(system_prompt: str, user_text: str, language: str, *, user_prefix: str | None = None) -> dict[str, Any]:
    if user_prefix is None:
        hint = f"Document language hint: {language}.\n\nDocument text:\n{user_text[:MAX_TEXT_CHARS]}"
    else:
        hint = f"{user_prefix}\n\n{user_text[:MAX_TEXT_CHARS]}"
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": hint},
        ],
        "stream": False,
        "options": {"temperature": 0.1},
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(f"{OLLAMA_BASE}/api/chat", json=payload)
        r.raise_for_status()
        data = r.json()
    content = data.get("message", {}).get("content", "")
    if not content:
        raise ValueError("Empty response from Ollama")
    return parse_json_from_llm(content)


async def extract_with_prompt(system_prompt: str, body: TextRequest) -> dict[str, Any]:
    try:
        return await call_ollama(system_prompt, body.text, body.language or "en")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Ollama unreachable: {e}") from e
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=502, detail=f"Could not parse model output: {e}") from e


async def generate_with_prompt(
    system_prompt: str,
    user_text: str,
    language: str,
    *,
    user_prefix: str | None = None,
) -> dict[str, Any]:
    try:
        return await call_ollama(system_prompt, user_text, language, user_prefix=user_prefix)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Ollama unreachable: {e}") from e
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=502, detail=f"Could not parse model output: {e}") from e


def _normalize_cpv_code(raw: Any) -> str:
    digits = re.sub(r"\D", "", str(raw or ""))
    if len(digits) >= 8:
        return digits[:8]
    if len(digits) >= 2:
        return digits.ljust(8, "0")[:8]
    return ""


def _build_questionnaire_user_text(body: QuestionnaireGenerateRequest) -> str:
    parts = [
        "INTERNAL procurement notes (for AI context only — do NOT copy into title or description):",
        body.description,
    ]
    if body.cpvCandidates:
        parts.append("ALLOWED CPV CODE LIST (select 1-3 from this list ONLY, use exact code):")
        for c in body.cpvCandidates[:25]:
            code = str(c.get("code") or "").strip()
            desc = str(c.get("description") or "").strip()
            if code:
                parts.append(f"- {code}: {desc}")
    return "\n\n".join(parts)


def _supplier_description_fallback(title: str, language: str) -> str:
    safe_title = (title or "").strip() or ("Leverantörskvalificering" if language == "sv" else "Supplier qualification")
    if language == "sv":
        return (
            f"Du inbjuds att besvara detta kvalificeringsformulär för «{safe_title}». "
            "Beskriv din erfarenhet, kapacitet och efterlevnad av relevanta krav så att den upphandlande "
            "organisationen kan bedöma om ditt företag är kvalificerat för uppdraget."
        )
    return (
        f'You are invited to complete this qualification questionnaire for "{safe_title}". '
        "Please describe your experience, capacity, and compliance with the relevant requirements "
        "so the contracting authority can assess whether your company is qualified for this opportunity."
    )


def _looks_like_internal_procurement_notes(text: str, internal_notes: str) -> bool:
    a = " ".join((text or "").lower().split())
    b = " ".join((internal_notes or "").lower().split())
    if not a or not b:
        return False
    if a == b:
        return True
    if len(a) >= 30 and b.find(a[: min(80, len(a))]) >= 0:
        return True
    if len(b) >= 30 and a.find(b[: min(80, len(b))]) >= 0:
        return True
    entity_markers = (
        "we need", "we want", "we require", "our organisation", "our organization",
        "our authority", "vi behöver", "vi vill", "vår organisation", "vårt behov",
    )
    return any(marker in a for marker in entity_markers)


def _normalize_supplier_description(ai_desc: str, title: str, internal_notes: str, language: str) -> str:
    desc = (ai_desc or "").strip()
    if not desc or _looks_like_internal_procurement_notes(desc, internal_notes):
        desc = _supplier_description_fallback(title, language)
    return desc[:2000]


@app.get("/health")
async def health():
    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{OLLAMA_BASE}/api/tags")
            ollama_ok = r.status_code == 200
    except Exception:
        pass
    return {
        "status": "ok" if ollama_ok else "degraded",
        "ollama": ollama_ok,
        "model": OLLAMA_MODEL,
        "docs": "/docs",
    }


@app.get("/endpoints")
async def list_endpoints():
    return {"service": "prequaliq-ai", "version": "2.0.0", "endpoints": ENDPOINTS_CATALOG}


@app.post("/extract/classify", response_model=ClassifyResponse)
async def extract_classify(
    body: TextRequest,
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
):
    verify_api_key(x_api_key)
    parsed = await extract_with_prompt(CLASSIFY_PROMPT, body)
    doc_type = parsed.get("documentType") or "unknown"
    section = parsed.get("section") or SECTION_FOR_TYPE.get(doc_type, "unknown")
    return ClassifyResponse(
        documentType=doc_type,
        section=section,
        confidence=float(parsed.get("confidence") or 0.5),
        fileNameHint=parsed.get("fileNameHint"),
        raw=parsed,
    )


@app.post("/extract/insurance", response_model=InsuranceResponse)
async def extract_insurance(
    body: TextRequest,
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
):
    verify_api_key(x_api_key)
    parsed = await extract_with_prompt(PROMPTS_BY_TYPE["insurance"], body)
    return InsuranceResponse(
        insurerName=parsed.get("insurerName"),
        insurancePolicyNumber=parsed.get("insurancePolicyNumber"),
        insuranceCoverageAmount=(
            str(parsed["insuranceCoverageAmount"])
            if parsed.get("insuranceCoverageAmount") is not None
            else None
        ),
        insuranceValidTo=parsed.get("insuranceValidTo"),
        raw=parsed,
    )


@app.post("/extract/company")
async def extract_company(
    body: TextRequest,
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
):
    verify_api_key(x_api_key)
    parsed = await extract_with_prompt(PROMPTS_BY_TYPE["company_registration"], body)
    return {"fields": parsed, "raw": parsed}


@app.post("/extract/certificate")
async def extract_certificate(
    body: TextRequest,
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
):
    verify_api_key(x_api_key)
    parsed = await extract_with_prompt(PROMPTS_BY_TYPE["quality_certificate"], body)
    return {"fields": parsed, "raw": parsed}


@app.post("/extract/financial")
async def extract_financial(
    body: TextRequest,
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
):
    verify_api_key(x_api_key)
    parsed = await extract_with_prompt(PROMPTS_BY_TYPE["financial"], body)
    return {"fields": parsed, "raw": parsed}


@app.post("/extract/auto", response_model=AutoExtractResponse)
async def extract_auto(
    body: TextRequest,
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
):
    verify_api_key(x_api_key)
    classified = await extract_with_prompt(CLASSIFY_PROMPT, body)
    doc_type = classified.get("documentType") or "unknown"
    section = classified.get("section") or SECTION_FOR_TYPE.get(doc_type, "unknown")
    confidence = float(classified.get("confidence") or 0.5)

    if doc_type == "unknown" or doc_type not in PROMPTS_BY_TYPE:
        return AutoExtractResponse(
            documentType=doc_type,
            section=section,
            confidence=confidence,
            fields={},
            raw={"classify": classified},
        )

    fields = await extract_with_prompt(PROMPTS_BY_TYPE[doc_type], body)
    return AutoExtractResponse(
        documentType=doc_type,
        section=section,
        confidence=confidence,
        fields=fields,
        raw={"classify": classified, "extract": fields},
    )


@app.post("/generate/questionnaire/understand", response_model=QuestionnaireUnderstandResponse)
async def understand_questionnaire(
    body: QuestionnaireUnderstandRequest,
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
):
    verify_api_key(x_api_key)
    lang = (body.language or "en").strip()[:2]
    lang_label = "Swedish" if lang == "sv" else "English"
    user_prefix = (
        f"Output language: {lang_label} ({lang}). "
        "You are a procurement questionnaire validator ONLY — not a general assistant. "
        "Reject travel, opinion, trivia, and chat questions. "
        "Never echo unrelated text as understanding."
    )
    user_text = f"User input to validate (procurement questionnaire context only):\n{body.description.strip()}"
    parsed = await generate_with_prompt(
        QUESTIONNAIRE_UNDERSTAND_PROMPT,
        user_text,
        lang,
        user_prefix=user_prefix,
    )
    is_valid = bool(parsed.get("isValid"))
    understanding = str(parsed.get("understanding") or "").strip()[:1200]
    category = str(parsed.get("category") or "").strip()[:200]
    rejection = str(parsed.get("rejectionReason") or "").strip()[:600]

    desc = body.description.strip()
    desc_lower = desc.lower()
    procurement_hints = (
        "procure", "construction", "construct", "build", "bridge", "service", "supply",
        "contract", "tender", "cleaning", "software", "equipment", "maintenance",
        "upphandl", "leverantör", "bygg", "bro", "tjänst",
    )
    has_procurement = any(h in desc_lower for h in procurement_hints)
    irrelevant = (
        not has_procurement
        and (
            bool(re.search(r"\bwhich\s+(place|city|country)", desc_lower))
            or "beautiful" in desc_lower
            or bool(re.search(r"^(what|which|who|where|why|how)\b", desc_lower) and "?" in desc)
        )
    )
    if irrelevant:
        is_valid = False
        understanding = ""
        category = ""
        rejection = (
            "This assistant only creates supplier qualification questionnaires for procurement. "
            "It cannot answer general or travel questions. Please describe works, services, or supplies to procure."
            if lang != "sv"
            else "Denna assistent skapar endast kvalificeringsenkäter för upphandling. "
            "Den svarar inte på allmänna eller resefrågor. Beskriv arbeten, tjänster eller varor att upphandla."
        )

    if is_valid and not has_procurement:
        is_valid = False
        understanding = ""
        category = ""
        if not rejection:
            rejection = (
                "Please describe the works, services, or supplies you want to procure."
                if lang != "sv"
                else "Beskriv arbeten, tjänster eller varor du vill upphandla."
            )

    if is_valid and understanding and desc_lower in understanding.lower():
        if not has_procurement:
            is_valid = False
            understanding = ""
            category = ""

    if is_valid and not understanding:
        understanding = (
            f"You want to qualify suppliers for: {desc[:500]}"
            if has_procurement
            else ""
        )
    if is_valid and not category:
        category = "Procurement"
    if not is_valid and not rejection:
        rejection = (
            "Please describe the works, services, or supplies you want to procure so we can create a qualification questionnaire."
            if lang != "sv"
            else "Beskriv arbeten, tjänster eller varor du vill upphandla så att vi kan skapa en kvalificeringsenkät."
        )
    return QuestionnaireUnderstandResponse(
        isValid=is_valid,
        understanding=understanding if is_valid else "",
        category=category if is_valid else "",
        rejectionReason=rejection if not is_valid else "",
        raw=parsed,
    )


@app.post("/generate/questionnaire", response_model=QuestionnaireGenerateResponse)
async def generate_questionnaire(
    body: QuestionnaireGenerateRequest,
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
):
    verify_api_key(x_api_key)
    user_text = _build_questionnaire_user_text(body)
    lang = (body.language or "en").strip()[:2]
    lang_label = "Swedish" if lang == "sv" else "English"
    user_prefix = (
        f"Output language: {lang_label} ({lang}). "
        "Write title, description, and all questions in this language. "
        "Description must be supplier-facing (address suppliers as you/your company)."
    )
    parsed = await generate_with_prompt(
        QUESTIONNAIRE_GENERATE_PROMPT,
        user_text,
        lang,
        user_prefix=user_prefix,
    )
    title = str(parsed.get("title") or "Supplier qualification questionnaire").strip()[:200]
    desc = _normalize_supplier_description(
        str(parsed.get("description") or ""),
        title,
        body.description,
        lang,
    )

    allowed_codes = set()
    if body.cpvCandidates:
        for c in body.cpvCandidates:
            norm = _normalize_cpv_code(c.get("code"))
            if norm:
                allowed_codes.add(norm)

    raw_selected = parsed.get("selectedCpvCodes")
    if not isinstance(raw_selected, list):
        raw_selected = parsed.get("cpvCodeHints") if isinstance(parsed.get("cpvCodeHints"), list) else []

    selected_cpv: list[dict[str, Any]] = []
    for item in raw_selected[:5]:
        if not isinstance(item, dict):
            continue
        code = _normalize_cpv_code(item.get("code"))
        if not code:
            continue
        if allowed_codes and code not in allowed_codes:
            continue
        selected_cpv.append({
            "code": code,
            "reason": str(item.get("reason") or "Selected from catalog").strip()[:300],
        })

    questions = parsed.get("questions") if isinstance(parsed.get("questions"), list) else []

    allowed_types = {"text", "textarea", "number", "date", "yes_no", "multiple_choice", "radio", "checkbox", "dropdown"}
    normalized_questions = []
    for q in questions[:15]:
        if not isinstance(q, dict):
            continue
        qtext = str(q.get("questionText") or "").strip()
        if len(qtext) < 5:
            continue
        qtype = str(q.get("questionType") or "text").strip()
        if qtype not in allowed_types:
            qtype = "text"
        requires_doc = bool(q.get("requiresDocument"))
        doc_type = str(q.get("documentType")).strip() if q.get("documentType") else None
        options = q.get("options") if isinstance(q.get("options"), list) else None
        if qtype in ("radio", "dropdown", "multiple_choice", "checkbox") and options:
            options = [str(o).strip() for o in options if str(o).strip()][:8]
        else:
            options = None
        normalized_questions.append({
            "questionText": qtext[:500],
            "questionType": qtype,
            "isRequired": bool(q.get("isRequired", True)),
            "requiresDocument": requires_doc,
            "documentType": doc_type[:120] if doc_type else None,
            "options": options,
        })

    return QuestionnaireGenerateResponse(
        title=title,
        description=desc,
        selectedCpvCodes=selected_cpv,
        cpvCodeHints=selected_cpv,
        searchKeywords=[],
        questions=normalized_questions,
        raw=parsed,
    )
