"""
Evaluation harness for the Selina vision pipeline.

Put test photos and clips in vision/eval_data/ and describe them in
vision/eval_data/labels.csv with these columns:

    file,expected_faces,expected_action,note
    group1.jpg,3,add_to_timeline,three people outdoors
    dark1.jpg,,request_retake,phone in a dark room
    shake1.mp4,,raise_priority_for_review,shaken phone clip

expected_faces can be left empty for files where it does not apply.
Use only photos you took yourself or people who agreed. Do not commit them.

Run from the vision folder:
    python evaluate.py

It writes eval_results.csv and prints a summary, then lists every miss so
they can go in the report as failure cases.
"""

import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from selina_vision.pipeline import process_image, process_video, evidence_to_action

ROOT = Path(__file__).parent
DATA = ROOT / "eval_data"
OUT = ROOT / "eval_output"


def main():
    labels_path = DATA / "labels.csv"
    if not labels_path.exists():
        sys.exit(f"Missing {labels_path}. See the top of this file.")

    OUT.mkdir(exist_ok=True)
    rows = list(csv.DictReader(open(labels_path, newline="", encoding="utf-8")))
    results = []

    for row in rows:
        path = DATA / row["file"]
        is_video = path.suffix.lower() in (".mp4", ".mov", ".avi")
        try:
            r = (process_video if is_video else process_image)(str(path), str(OUT))
        except Exception as exc:  # keep going, an error is itself a result
            results.append({**row, "got_faces": "", "got_action": f"ERROR: {exc}",
                            "usable": "", "blur_variance": "", "brightness": "", "faces_ok": "", "action_ok": False})
            continue

        action = evidence_to_action(r)["action"]
        got_faces = r.face_blur.faces_blurred if r.face_blur else None
        expected_faces = int(row["expected_faces"]) if row.get("expected_faces", "").strip() else None

        results.append({
            **row,
            "got_faces": "" if got_faces is None else got_faces,
            "got_action": action,
            "usable": r.quality.is_usable,
            "blur_variance": round(float(r.quality.blur_variance), 1),
            "brightness": round(float(r.quality.mean_brightness), 1),
            "faces_ok": "" if expected_faces is None or got_faces is None else got_faces == expected_faces,
            "action_ok": action == row["expected_action"],
        })

    fields = list(results[0].keys())
    with open(ROOT / "eval_results.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(results)

    # Face metrics, counted over files where faces were actually checked
    exp_total = got_found = missed = extra = 0
    for r in results:
        if r["faces_ok"] == "":
            continue
        e, g = int(r["expected_faces"]), int(r["got_faces"])
        exp_total += e
        got_found += min(e, g)
        missed += max(e - g, 0)
        extra += max(g - e, 0)

    action_ok = sum(1 for r in results if r["action_ok"] is True)
    print(f"\nFiles: {len(results)}")
    print(f"Action accuracy: {action_ok}/{len(results)}")
    if exp_total:
        print(f"Face recall: {got_found}/{exp_total} ({100 * got_found / exp_total:.0f}%)")
        print(f"Missed faces: {missed}   Extra blurs (false positives): {extra}")

    if any(r.get("group") for r in results):
        print("\nBy group (action correct / face count correct):")
        for g in dict.fromkeys(r.get("group", "") for r in results):
            gr = [r for r in results if r.get("group", "") == g]
            a = sum(1 for r in gr if r["action_ok"] is True)
            fr = [r for r in gr if r["faces_ok"] != ""]
            fk = sum(1 for r in fr if r["faces_ok"] is True)
            faces = f"{fk}/{len(fr)}" if fr else "-"
            print(f"  {g or '(none)':<14} action {a}/{len(gr)}   faces {faces}")

    misses = [r for r in results if r["action_ok"] is not True or r["faces_ok"] is False]
    print(f"\nMisses ({len(misses)}):")
    for r in misses:
        print(f"  {r['file']}: expected faces={r.get('expected_faces') or '-'} action={r['expected_action']}"
              f" | got faces={r['got_faces'] if r['got_faces'] != '' else '-'} action={r['got_action']}"
              f" | {r.get('note', '')}")
    print("\nFull table in eval_results.csv, blurred outputs in eval_output/")


if __name__ == "__main__":
    main()