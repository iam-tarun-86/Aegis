"""Normalisation for generated reports.

Models are inconsistent about the citation contract even when told exactly what
to emit. Observed in benchmarking against the writer prompt:

    nemotron-3-super-120b   【Source 2 (Confidence: High)】   fullwidth brackets
    nemotron-super-49b      [Source 2, High]                  right brackets, wrong shape
    local Gemma-4-E4B       [Source 1]                        confidence dropped entirely
    stepfun / gemma         "Got it, let's tackle this..."     reasoning preamble before the title

Rather than fight this per model, every report passes through here on the way
out so the frontend only ever sees one citation form.
"""

import re

CANONICAL = "[Source {ids} (Confidence: {level})]"

_LEVELS = {"high": "High", "medium": "Medium", "med": "Medium", "low": "Low"}

# 【Source 2 (Confidence: High)】 and friends — CJK brackets around a citation.
_FULLWIDTH = re.compile(r"【\s*(Sources?\s+[^】]*?)\s*】", re.I)

# [Source 2 (Confidence: High)] / (Confidence High) / (High) / , High / : High / - High
_CITE = re.compile(
    r"\[\s*Sources?\s+"
    r"(?P<ids>\d+(?:\s*(?:,|and|&|-|–)\s*\d+)*)"
    r"\s*(?:"
    r"\(\s*Confidence\s*[:=]?\s*(?P<c1>High|Medium|Med|Low)\s*\)"
    r"|\(\s*(?P<c2>High|Medium|Med|Low)\s*\)"
    r"|[,;:—–-]\s*(?:Confidence\s*[:=]?\s*)?(?P<c3>High|Medium|Med|Low)"
    r")\s*\]",
    re.I,
)

# A fenced block wrapping the whole report, e.g. ```markdown ... ```
_FENCE_WRAP = re.compile(r"\A\s*```[a-zA-Z]*\s*\n(?P<body>.*?)\n?```\s*\Z", re.S)


def _clean_ids(raw: str) -> str:
    """'1 , 2 and 3' -> '1, 2, 3'."""
    return ", ".join(re.findall(r"\d+", raw))


def _canonicalise(match: re.Match) -> str:
    level = match.group("c1") or match.group("c2") or match.group("c3") or ""
    return CANONICAL.format(
        ids=_clean_ids(match.group("ids")),
        level=_LEVELS.get(level.lower(), "Medium"),
    )


def strip_preamble(text: str) -> str:
    """Drop anything a model emits before the report's `# ` title.

    Reasoning models sometimes spill their monologue into the answer channel
    ("Got it, let's tackle this. First, the user wants..."). The report contract
    says the first line is an H1, so anything above the first H1 is not report.
    Only trims when the stray text is short enough to be a preamble rather than
    a report that simply lacks a title.
    """
    match = re.search(r"^#\s+\S", text, re.M)
    if not match or match.start() == 0:
        return text
    head = text[: match.start()]
    if head.strip() and len(head) < 2000 and not re.search(r"^##\s", head, re.M):
        return text[match.start():]
    return text


def normalize_report(text: str) -> str:
    """Make a model's report conform to the citation and layout contract."""
    if not text:
        return text

    fence = _FENCE_WRAP.match(text)
    if fence:
        text = fence.group("body")

    text = strip_preamble(text.strip())

    # Fullwidth brackets -> ASCII, then canonicalise every recognised variant.
    text = _FULLWIDTH.sub(lambda m: "[" + m.group(1) + "]", text)
    text = _CITE.sub(_canonicalise, text)

    # Collapse runs of blank lines left behind by trimming.
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    return text.strip()


def citation_stats(text: str) -> dict:
    """Counts used by the writer log so citation health is visible per run."""
    canonical = len(re.findall(r"\[Source [\d, ]+ \(Confidence: (?:High|Medium|Low)\)\]", text or ""))
    bare = len(re.findall(r"\[\s*Sources?\s+\d+[^\]]*\]", text or "")) - canonical
    return {"canonical": canonical, "non_canonical": max(0, bare)}
