"""
Smoke-test the front-end routing-guidance logic against every mock referral PDF.

This mirrors `inferDepartmentGuidance` in
`front_react/src/pages/ReferralQueue.jsx` so we can verify the recommendation
is *dynamic* — i.e. driven by the actual clinical content of each packet, not
fixed to "Neurology" by accident. Run from repo root:

    cd backend_flask && source venv/bin/activate \
        && python scripts/check_routing_logic.py
"""

from __future__ import annotations

import io
import re
import sys
from pathlib import Path

from PyPDF2 import PdfReader


# Keep these mirrored 1:1 with NEUROLOGY_KEYWORD_GROUPS / NEUROSURGERY_KEYWORD_GROUPS
# / PMR_KEYWORD_GROUPS in front_react/src/pages/ReferralQueue.jsx.
NEUROLOGY_KEYWORD_GROUPS = [
    {"category": "headache disorders", "keywords": ["migraine", "headache", "cephalalgia"]},
    {"category": "seizure or epilepsy", "keywords": ["seizure", "epilepsy", "convulsion"]},
    {
        "category": "cerebrovascular concerns",
        "keywords": ["stroke", "tia", "transient ischemic attack"],
    },
    {"category": "demyelinating disease", "keywords": ["multiple sclerosis", "demyelinating"]},
    {
        "category": "movement disorders",
        "keywords": ["parkinson", "tremor", "dystonia", "movement disorder"],
    },
    {
        "category": "cognitive concerns",
        "keywords": ["memory loss", "cognitive decline", "dementia"],
    },
    {
        "category": "neuromuscular disease",
        "keywords": [
            "neuropathy",
            "myopathy",
            "motor neuron disease",
            "als",
            "myasthenia",
            "muscular dystrophy",
        ],
    },
    {
        "category": "neuralgia / neuropathic pain",
        "keywords": ["trigeminal neuralgia", "neuralgia"],
    },
    {"category": "vestibular symptoms", "keywords": ["dizziness", "vertigo"]},
]

NEUROSURGERY_KEYWORD_GROUPS = [
    {
        "category": "spine pathology",
        "keywords": [
            "spinal stenosis",
            "lumbar stenosis",
            "cervical stenosis",
            "disc herniation",
            "radiculopathy",
            "myelopathy",
            "cord compression",
        ],
    },
    {
        "category": "neurovascular surgical lesions",
        "keywords": [
            "aneurysm",
            "avm",
            "arteriovenous malformation",
            "cavernoma",
            "subarachnoid hemorrhage",
            "intracerebral hemorrhage",
        ],
    },
    {
        "category": "neuro-oncology",
        "keywords": [
            "brain tumor",
            "brain mass",
            "intracranial mass",
            "intracranial lesion",
            "extra-axial mass",
            "extra-axial lesion",
            "glioma",
            "meningioma",
            "pituitary mass",
            "pituitary tumor",
            "metastasis",
        ],
    },
    {
        "category": "CSF disorders",
        "keywords": ["hydrocephalus", "shunt", "chiari", "normal pressure hydrocephalus"],
    },
    {
        "category": "surgical evaluation",
        "keywords": [
            "surgical resection",
            "decompression",
            "craniotomy",
            "subdural hematoma",
            "epidural hematoma",
        ],
    },
]

PMR_KEYWORD_GROUPS = [
    {
        "category": "rehabilitation services",
        "keywords": ["rehabilitation", "rehab", "physiatry", "physiatrist", "neurorehabilitation"],
    },
    {"category": "spasticity or tone management", "keywords": ["spasticity", "baclofen pump"]},
    {
        "category": "concussion or TBI",
        "keywords": ["concussion", "traumatic brain injury", "post-concussive"],
    },
]


def matches_keyword(corpus: str, keyword: str) -> bool:
    return re.search(rf"\b{re.escape(keyword)}\b", corpus, re.IGNORECASE) is not None


def collect_signal(corpus: str, label: str, groups):
    matched = []
    total = 0
    for group in groups:
        hits = [k for k in group["keywords"] if matches_keyword(corpus, k)]
        if hits:
            matched.append({"category": group["category"], "keywords": hits})
            total += len(hits)
    return {"label": label, "matched": matched, "total": total}


def format_groups(matched) -> str:
    return "; ".join(
        f"{g['category']} [{', '.join(g['keywords'])}]" for g in matched
    )


def infer_department(corpus: str):
    signals = sorted(
        [
            collect_signal(corpus, "Neurology", NEUROLOGY_KEYWORD_GROUPS),
            collect_signal(corpus, "Neurosurgery", NEUROSURGERY_KEYWORD_GROUPS),
            collect_signal(corpus, "Physical Medicine and Rehabilitation", PMR_KEYWORD_GROUPS),
        ],
        key=lambda s: s["total"],
        reverse=True,
    )
    leader = signals[0]
    runner_up = signals[1] if len(signals) > 1 else None

    if not leader or leader["total"] == 0:
        return ("Needs clarification", "no specialty-specific signals", signals)

    if runner_up and leader["total"] == runner_up["total"]:
        return ("Needs clarification (tie)", "balanced signals", signals)

    return (leader["label"], format_groups(leader["matched"]), signals)


def extract_pdf_text(pdf_path: Path) -> str:
    reader = PdfReader(io.BytesIO(pdf_path.read_bytes()))
    parts = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if text.strip():
            parts.append(text)
    return re.sub(r"\s+", " ", " ".join(parts)).strip()


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    mock_dir = repo_root / "mock_data"
    if not mock_dir.is_dir():
        print(f"mock_data dir not found at {mock_dir}", file=sys.stderr)
        return 1

    pdfs = sorted(mock_dir.glob("JHNR_*.pdf"))
    if not pdfs:
        print(f"No JHNR_*.pdf files in {mock_dir}", file=sys.stderr)
        return 1

    label_counts: dict[str, int] = {}
    rows: list[tuple[str, str, str, str]] = []

    for pdf in pdfs:
        try:
            corpus = extract_pdf_text(pdf).lower()
        except Exception as exc:
            rows.append((pdf.name, "ERROR", str(exc), ""))
            continue

        label, reason, signals = infer_department(corpus)
        label_counts[label] = label_counts.get(label, 0) + 1
        competing = "; ".join(
            f"{s['label']} ({s['total']})" for s in signals if s["total"] > 0
        )
        rows.append((pdf.name, label, reason, competing))

    name_w = max(len(r[0]) for r in rows) + 2
    label_w = max(len(r[1]) for r in rows) + 2
    print(f"{'PDF':<{name_w}}{'Recommended':<{label_w}}Top signals (category [keywords])")
    print("-" * (name_w + label_w + 60))
    for name, label, reason, competing in rows:
        print(f"{name:<{name_w}}{label:<{label_w}}{reason}")
        if competing:
            print(f"{'':<{name_w}}{'':<{label_w}}  scoreboard: {competing}")

    print()
    print("Recommendation distribution:")
    for label, count in sorted(label_counts.items(), key=lambda x: -x[1]):
        print(f"  {label}: {count}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
