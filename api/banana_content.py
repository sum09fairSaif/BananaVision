"""
banana_content.py - turns the human-written banana_stages.md into data.

No nutrition text is hard-coded anywhere in the app. A writer edits the
document; this module locates each piece of text by its heading and returns
{stage: {field: text}}. Rewriting the prose needs no code change; only
renaming a heading does.
"""

import re
from pathlib import Path

# The four canonical stages the model can output.
STAGES = ["unripe", "ripe", "overripe", "rotten"]

# Heading text in the document (lowercased) -> field name the app receives.
SECTIONS = {
    "essential nutrients":       "nutrients",
    "benefits at this stage":    "benefits",
    "what's missing":            "missing",
    "potential risks":           "risks",
    "encouraged for":            "encouraged_for",
    "who should limit or avoid": "avoid_or_limit",
}
FIELDS = list(SECTIONS.values())



def _read_text(path):
    """Read .md/.txt as plain text; extract text from .pdf if pypdf is installed."""
    path = Path(path)
    if path.suffix.lower() == ".pdf":
        from pypdf import PdfReader              # pip install pypdf
        return "\n".join((p.extract_text() or "") for p in PdfReader(str(path)).pages)
    return path.read_text(encoding="utf-8")


def _slug(title):
    """'Storage tips' -> 'storage_tips', for sections beyond the six known ones."""
    return re.sub(r"[^a-z0-9]+", "_", title.lower()).strip("_")



def load_stage_guide(path):
    """
    Parse the stage document into {stage: {field: text}}.
    Text is located by heading, never by position, so prose can be rewritten freely.
    """
    text = _read_text(path)
    has_markdown = bool(re.search(r"(?m)^##+ ", text))   # false for .txt/.pdf

    guide, stage, field, buf = {}, None, None, []

    def store():
        """Attach the lines collected so far to the current stage + field."""
        if stage and field and buf:
            guide.setdefault(stage, {})[field] = "\n".join(buf).strip()
        buf.clear()

    for line in text.splitlines():
        s = line.strip()
        level = len(s) - len(s.lstrip("#")) if s.startswith("#") else 0
        title = s.lstrip("#").strip().rstrip(":")
        low = title.lower()

        # In markdown, '##' means stage and '###' means section. In plain text
        # or extracted PDF the '#' marks are gone, so match the names instead.
        is_stage   = (level == 2) if has_markdown else (low in STAGES)
        is_section = (level == 3) if has_markdown else (low in SECTIONS)

        if is_stage:
            store()
            stage = low if low in STAGES else None   # ignores '## Sources and references'
            field = None
        elif is_section:
            store()
            field = SECTIONS.get(low, _slug(title))  # unknown '###' flows through as a new field
        elif level == 1:                             # '# Title' - outside every stage
            store()
            stage = field = None
        elif stage and field:
            buf.append(line)                         # ordinary prose

    store()                                          # don't lose the final section
    return guide



def missing_pieces(guide, stages=STAGES, fields=FIELDS):
    """Every stage/field the document failed to supply. Empty list means complete."""
    gaps = []
    for stage in stages:
        if stage not in guide:
            gaps.append(f"{stage} (whole stage missing)")
            continue
        gaps += [f"{stage}.{f}" for f in fields if not guide[stage].get(f)]
    return gaps



## ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ##
if __name__ == "__main__":
    import sys
    doc = sys.argv[1] if len(sys.argv) > 1 else "../api/banana_stages.md"
    guide = load_stage_guide(doc)
    gaps = missing_pieces(guide)
    print("Stages found :", list(guide))
    print("Fields/stage :", list(guide.get("ripe", {})))
    print("Gaps         :", gaps or "none")


