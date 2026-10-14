"""
Builds the evaluation set from clean portraits.

Put your portraits (png or jpg, one person each) in vision/eval_data/, then
run from the vision folder:

    python make_variants.py

For every portrait it writes degraded copies into eval_data/variants/ and
writes eval_data/labels.csv with the expected result for each file. Any old
labels.csv is saved as labels_backup.csv first.

If a portrait has more than one person, edit expected_faces for its rows in
labels.csv afterwards (the variants of it too).

These are synthetic degradations of real photos, so they test the pipeline
against known problems. They are not a substitute for real phone footage,
and the report says so.
"""

import csv
from pathlib import Path

import cv2
import numpy as np

DATA = Path(__file__).parent / "eval_data"
VARIANTS = DATA / "variants"
SOURCE_EXT = {".png", ".jpg", ".jpeg"}


def make_variants(img):
    h, w = img.shape[:2]
    out = {}

    out["blurry"] = cv2.GaussianBlur(img, (0, 0), 9)

    out["dark"] = np.clip(img.astype(np.float32) * 0.12, 0, 255).astype(np.uint8)

    out["washedout"] = np.clip(img.astype(np.float32) + 150, 0, 255).astype(np.uint8)

    # Small face: the portrait shrunk to 22% and placed on a textured background
    rng = np.random.default_rng(7)
    canvas = np.full((h, w, 3), 128, np.float32) + rng.normal(0, 25, (h, w, 3))
    canvas = np.clip(canvas, 0, 255).astype(np.uint8)
    sw, sh = int(w * 0.22), int(h * 0.22)
    small = cv2.resize(img, (sw, sh), interpolation=cv2.INTER_AREA)
    x0, y0 = (w - sw) // 2, int(h * 0.55)
    canvas[y0:y0 + sh, x0:x0 + sw] = small
    out["small_face"] = canvas

    out["upside_down"] = cv2.rotate(img, cv2.ROTATE_180)

    out["half_cropped"] = img[:, : int(w * 0.52)].copy()

    tiny = cv2.resize(img, (200, int(200 * h / w)), interpolation=cv2.INTER_AREA)
    out["low_res"] = tiny

    return out


def expected_for(variant):
    if variant in ("blurry", "dark", "washedout"):
        return "", "request_retake"
    return 1, "add_to_timeline"


def main():
    sources = sorted(p for p in DATA.iterdir() if p.suffix.lower() in SOURCE_EXT)
    if not sources:
        raise SystemExit(f"No portraits found in {DATA}")

    VARIANTS.mkdir(exist_ok=True)
    old = DATA / "labels.csv"
    if old.exists():
        old.replace(DATA / "labels_backup.csv")

    rows = []
    for src in sources:
        img = cv2.imread(str(src))
        if img is None:
            print("skipping unreadable", src.name)
            continue
        rows.append([src.name, 1, "add_to_timeline", "original", f"{src.stem} original"])
        for variant, image in make_variants(img).items():
            name = f"variants/{src.stem}__{variant}.jpg"
            cv2.imwrite(str(DATA / name), image, [cv2.IMWRITE_JPEG_QUALITY, 70 if variant == "low_res" else 92])
            faces, action = expected_for(variant)
            rows.append([name, faces, action, variant, f"{src.stem} {variant}"])

    with open(DATA / "labels.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["file", "expected_faces", "expected_action", "group", "note"])
        w.writerows(rows)
    print(f"{len(sources)} portraits -> {len(rows)} rows in eval_data/labels.csv")


if __name__ == "__main__":
    main()