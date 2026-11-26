import io
import os
import re
from typing import Any

from docx import Document
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from openai import OpenAI
from pypdf import PdfReader

app = FastAPI(title="Roast My CV", description="An honest, role-aware CV review.")
app.mount("/static", StaticFiles(directory="static"), name="static")
MAX_BYTES = 10 * 1024 * 1024


@app.get("/", response_class=HTMLResponse)
async def home() -> FileResponse:
    return FileResponse("index.html")


@app.get("/results", response_class=HTMLResponse)
async def results_page() -> FileResponse:
    return FileResponse("results.html")


def extract_text(filename: str, content: bytes) -> str:
    if filename.lower().endswith(".pdf"):
        reader = PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    document = Document(io.BytesIO(content))
    paragraphs = [paragraph.text for paragraph in document.paragraphs]
    for table in document.tables:
        paragraphs.extend(cell.text for row in table.rows for cell in row.cells)
    return "\n".join(paragraphs)


def local_review(text: str, dream_role: str) -> dict[str, Any]:
    words = re.findall(r"\b[\w'-]+\b", text)
    lower = text.lower()
    metrics = re.findall(r"(?:\$|£|€|\b\d+(?:\.\d+)?\s?%|\b\d{2,}\+?\s?(?:users|customers|clients|people|projects|hours|days|weeks))", text, re.I)
    action_verbs = sum(bool(re.search(rf"\b{verb}\w*\b", lower)) for verb in ["led", "built", "launched", "improved", "increased", "reduced", "delivered", "designed", "managed", "created"])
    sections = [name for name in ["experience", "education", "skills", "projects"] if name in lower]
    score = min(92, max(37, 46 + min(len(words), 900) // 60 + min(len(metrics) * 3, 15) + len(sections) * 3))
    wins = [
        {"title": "There’s something to build on", "body": f"Your CV has about {len(words)} words of source material. We found {len(sections)} recognizable core sections: {', '.join(sections) or 'let’s give the structure some clearer signposts'}.", "kind": "good"},
        {"title": "Show the outcome, not just the activity", "body": f"We spotted {len(metrics)} measurable result{'' if len(metrics) == 1 else 's'}. Add the before-and-after numbers wherever you can: revenue, time saved, conversion, reach, or quality.", "kind": "fix", "suggestions": ["Add a number that proves the change: percentage, time saved, revenue, reach, or volume.", "Include the timeframe and scale, such as customers served or projects delivered."], "example": "Reduced [process time] by [X%] across [team or customer group] in [timeframe]."},
        {"title": "Make every bullet earn its space", "body": f"We found about {action_verbs} action-led skill{'' if action_verbs == 1 else 's'} across your CV. Give each experience bullet a clear action, the work you owned, and the result it produced.", "kind": "fix", "suggestions": ["Start with a precise action verb: Built, launched, redesigned, automated, negotiated, or mentored.", "Name what you personally did, then add the outcome and a number if you can.", "Choose the verb that truthfully describes your contribution; avoid claiming ownership you didn’t have."], "example": "Built [tool or process] for [team or customers], cutting [time or cost] by [X%] over [timeframe]."},
    ]
    return {
        "dream_role": dream_role,
        "score": score,
        "score_label": "A solid start" if score >= 65 else "Room to level up",
        "summary": f"We reviewed the CV text against your goal of becoming a {dream_role}. This first-pass review is based on document structure and evidence in the CV; a deeper role-specific review is available when an LLM API key is connected.",
        "strengths": [f"Your CV contains {len(words)} words of experience to work with.", f"We found {len(sections)} recognizable sections, including {', '.join(sections) or 'experience details'}.", f"The next opportunity: bring your results into sharper focus with numbers ({len(metrics)} currently detected)."],
        "findings": wins,
        "keywords": ["impact", "ownership", "measurable results", "role-specific skills"],
        "source": "local",
    }


def ai_review(text: str, dream_role: str) -> dict[str, Any] | None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "You are a direct but kind CV coach. Give evidence-based, specific advice, never invent CV facts, and never insult the candidate. Respond as a JSON object with keys score (integer 0-100), score_label (short), summary (string), strengths (array of 3 strings), findings (array of 3 objects with title, body, kind where kind is good or fix, suggestions (array of 2-3 concrete next steps), and example (one concise fill-in-the-blank CV bullet illustrating the suggested improvement)), keywords (array of 4-6 strings). For every bullet-writing finding, recommend accurate action verbs and give a useful example bullet with placeholders rather than inventing a candidate result."},
            {"role": "user", "content": f"Dream role: {dream_role}\n\nCV text:\n{text[:16000]}"},
        ],
        temperature=0.5,
    )
    result = response.choices[0].message.content
    if not result:
        return None
    import json

    review = json.loads(result)
    review["dream_role"] = dream_role
    review["source"] = "ai"
    return review


@app.post("/api/review")
async def review_cv(cv: UploadFile = File(...), dream_role: str = Form(...)) -> dict[str, Any]:
    role = dream_role.strip()
    if not role or len(role) > 120:
        raise HTTPException(status_code=422, detail="Tell us which role you’re going for (up to 120 characters).")
    filename = cv.filename or ""
    if not filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(status_code=415, detail="Please upload a PDF or DOCX file.")
    content = await cv.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="That file is over 10 MB. Please choose a smaller CV.")
    try:
        text = extract_text(filename, content).strip()
    except Exception as exc:
        raise HTTPException(status_code=422, detail="We couldn’t read that file. Try exporting your CV as a text-based PDF or DOCX.") from exc
    if len(text) < 50:
        raise HTTPException(status_code=422, detail="We couldn’t find enough selectable text. Try an accessible PDF or DOCX instead of a scan.")
    try:
        return ai_review(text, role) or local_review(text, role)
    except Exception:
        # A temporary LLM API issue should not block the useful local review.
        return local_review(text, role)
