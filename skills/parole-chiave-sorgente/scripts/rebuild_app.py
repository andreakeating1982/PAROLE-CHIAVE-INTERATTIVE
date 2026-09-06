#!/usr/bin/env python3
"""
rebuild_app.py — Ricostruisce una NUOVA app identica a «PAROLE CHIAVE SORGENTE»
cambiando SOLO il set delle domande (e, opzionalmente, i titoli).

Struttura fissa dell'app sorgente:
  - 8 domande (MAPA 1 = 1-5, MAPA 2 = 6-8)
  - multi-risposta su domande 4 e 5 (correctAnswer come array di 2)
  - audio topic-specifico in client/public/audio/ + client/src/lib/audioData.ts

Usage:
    python rebuild_app.py --name <slug> --questions <domande.json> \
        [--app-title "TITOLO UI"] [--pdf-title "TITOLO PDF"] \
        [--source "https://github.com/USER/REPO.git"]
"""

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

SOURCE = Path("/home/user/shakespeare-quiz")

IGNORE = shutil.ignore_patterns(
    "node_modules", ".git", "dist", "dev-server.log", ".env",
    ".quiz-backups", "*.zip", "*.log", ".DS_Store",
    "codice-sorgente-completo.txt", "*.db", "*.sqlite", "*.sqlite3",
    "skills",  # la skill è tooling di Marky, non fa parte dell'app
)

# Coppie mirror: (copia radice, copia interna) che devono restare identiche.
MIRROR_PAIRS = [
    ("questions.ts", "server/questions.ts"),
    ("reportPdf.ts", "client/src/lib/reportPdf.ts"),
    ("StudentQuiz.tsx", "client/src/pages/StudentQuiz.tsx"),
    ("TeacherPage.tsx", "client/src/pages/TeacherPage.tsx"),
]

# Stringhe LITERALI da sostituire nell'app sorgente (titolo UI mostrato
# agli studenti e titolo sui PDF). NON sono il nome della skill:
# «PAROLE CHIAVE SORGENTE» è solo come chiamiamo il sorgente.
OLD_UI_TITLE = "PAROLE CHIAVE INTERATTIVE"
OLD_PDF_TITLE = "PAROLE CHIAVE DI ROSALÍA DE CASTRO"


def bail(msg):
    print(f"✖ {msg}")
    sys.exit(1)


def clone_from_github(url: str, target: Path) -> bool:
    """Clona una repository GitHub. Ritorna True se ok, False se fallito."""
    try:
        subprocess.run(
            ["git", "clone", "--depth", "1", url, str(target)],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        if target.exists():
            shutil.rmtree(target, ignore_errors=True)
        return False
    git_dir = target / ".git"
    if git_dir.exists():
        shutil.rmtree(git_dir)
    skills_dir = target / "skills"
    if skills_dir.exists():
        shutil.rmtree(skills_dir, ignore_errors=True)
    return True


def clone_source(target: Path, repo_url=None):
    url = (repo_url or "").strip()
    if url:
        print(f"  ↓ Clonazione da GitHub: {url}")
        if clone_from_github(url, target):
            print("  ✔ Sorgente clonata da GitHub")
            return
        print("  → clone GitHub fallito; fallback alla sorgente locale")
    if SOURCE.exists():
        shutil.copytree(SOURCE, target, ignore=IGNORE)
        print(f"  ✔ Sorgente copiata da {SOURCE}")
    else:
        bail(f"Nessuna sorgente disponibile: manca {SOURCE} e non è stato passato --source")


def load_questions(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    questions = data.get("questions")
    if not questions:
        bail("Il JSON non contiene il campo 'questions'")
    return data, questions


def ts_string(s):
    return str(s).replace("\\", "\\\\").replace('"', '\\"')


def generate_questions_ts(data, questions):
    title = data.get("pdf_title") or data.get("app_title") or OLD_UI_TITLE
    lines = [
        "/**",
        f" * {title} — Domande del quiz",
        " *",
        " * MAPA 1 = domande 1-5, MAPA 2 = domande 6-8.",
        " * Multi-risposta su domande 4 e 5 (correctAnswer come array).",
        " */",
        "",
        "export const SHAKESPEARE_QUESTIONS = [",
    ]
    for q in questions:
        num = q.get("number")
        if num == 1:
            lines.append("  // ═══════════════════ MAPA 1 ═══════════════════")
        elif num == 6:
            lines.append("")
            lines.append("  // ═══════════════════ MAPA 2 ═══════════════════")
        lines.append("  {")
        lines.append(f"    number: {num},")
        lines.append(f'    question: "{ts_string(q.get("question", ""))}",')
        opts = ", ".join(f'"{ts_string(o)}"' for o in q.get("options", []))
        lines.append(f"    options: [{opts}],")
        ca = q.get("correctAnswer")
        if isinstance(ca, list):
            ca_s = ", ".join(f'"{ts_string(c)}"' for c in ca)
            lines.append(f"    correctAnswer: [{ca_s}],")
        else:
            lines.append(f'    correctAnswer: "{ts_string(ca)}",')
        lines.append("  },")
    lines.append("];")
    lines.append("")
    return "\n".join(lines)


def replace_in_file(path, old, new):
    p = Path(path)
    if not p.exists():
        return False
    txt = p.read_text(encoding="utf-8")
    if old not in txt:
        return False
    p.write_text(txt.replace(old, new), encoding="utf-8")
    return True


def main():
    ap = argparse.ArgumentParser(
        description="Ricostruisce una nuova app da PAROLE CHIAVE SORGENTE")
    ap.add_argument("--name", required=True, help="slug nuova app (es. parole-chiave-roma)")
    ap.add_argument("--questions", required=True, help="percorso del JSON domande")
    ap.add_argument("--app-title", default=None, help="titolo UI (default: PAROLE CHIAVE INTERATTIVE)")
    ap.add_argument("--pdf-title", default=None, help="titolo sui PDF (default: app-title)")
    ap.add_argument("--source", default=None, help="URL repo GitHub sorgente (opzionale)")
    ap.add_argument("--force", action="store_true", help="sovrascrive la destinazione")
    ap.add_argument("--no-install", action="store_true", help="salta pnpm install e check")
    args = ap.parse_args()

    target = Path(f"/home/user/{args.name}")
    if target.exists():
        if not args.force:
            bail(f"Destinazione {target} già esistente (usa --force per sovrascrivere)")
        shutil.rmtree(target)

    data, questions = load_questions(args.questions)
    app_title = args.app_title or data.get("app_title")
    pdf_title = args.pdf_title or data.get("pdf_title") or app_title

    print(f"→ Ricostruzione di «{args.name}»")
    clone_source(target, args.source)

    # 1) Domande (server + mirror radice)
    qts = generate_questions_ts(data, questions)
    (target / "server" / "questions.ts").write_text(qts, encoding="utf-8")
    shutil.copyfile(target / "server" / "questions.ts", target / "questions.ts")
    print("  ✔ domande scritte in server/questions.ts + mirror radice")

    # 2) Titolo PDF (client reportPdf.ts + mirror radice)
    if pdf_title:
        rp = target / "client" / "src" / "lib" / "reportPdf.ts"
        if replace_in_file(rp, OLD_PDF_TITLE, pdf_title):
            shutil.copyfile(rp, target / "reportPdf.ts")
            print(f"  ✔ titolo PDF → «{pdf_title}»")
        else:
            print("  ⚠ stringa titolo PDF non trovata (nessun cambio)")

    # 3) Titolo UI (index.html, Home, StudentQuiz, TeacherPage + mirror)
    if app_title:
        for f in [
            target / "client" / "index.html",
            target / "client" / "src" / "pages" / "Home.tsx",
            target / "client" / "src" / "pages" / "StudentQuiz.tsx",
            target / "client" / "src" / "pages" / "TeacherPage.tsx",
        ]:
            replace_in_file(f, OLD_UI_TITLE, app_title)
        # mirror StudentQuiz + TeacherPage
        shutil.copyfile(target / "client" / "src" / "pages" / "StudentQuiz.tsx",
                        target / "StudentQuiz.tsx")
        shutil.copyfile(target / "client" / "src" / "pages" / "TeacherPage.tsx",
                        target / "TeacherPage.tsx")
        print(f"  ✔ titolo UI → «{app_title}»")

    # 4) package.json name
    pkg = target / "package.json"
    pj = json.loads(pkg.read_text(encoding="utf-8"))
    pj["name"] = args.name
    pkg.write_text(json.dumps(pj, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("  ✔ package.json rinominato")

    # 5) git init (per i checkpoint webdev)
    subprocess.run(["git", "init", "-q"], cwd=target)
    subprocess.run(["git", "add", "-A"], cwd=target)
    subprocess.run(
        ["git", "-c", "user.email=marky@easy-peasy.ai", "-c", "user.name=Marky",
         "commit", "-qm", "Initial clone"], cwd=target)
    print("  ✔ git inizializzato")

    # 6) install + check (opzionale)
    if not args.no_install:
        print("  ↓ pnpm install ...")
        r = subprocess.run(["pnpm", "install"], cwd=target)
        if r.returncode == 0:
            print("  ↓ pnpm check ...")
            subprocess.run(["pnpm", "check"], cwd=target)

    # 7) verifica mirror
    print("  → verifica mirror:")
    for root_f, inner_f in MIRROR_PAIRS:
        a = (target / root_f).read_text(encoding="utf-8")
        b = (target / inner_f).read_text(encoding="utf-8")
        ok = "✓" if a == b else "✖"
        print(f"    {ok} {root_f} ↔ {inner_f}")

    print(f"✔ Fatto. Nuova app in {target}")


if __name__ == "__main__":
    main()
