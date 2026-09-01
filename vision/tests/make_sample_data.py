"""
Builds small synthetic test files so the pipeline can be run and verified
without any real photos or incident footage. Run this before test_pipeline.py.
"""

import cv2
import numpy as np
from pathlib import Path

OUT = Path(__file__).parent.parent / "sample_data"
OUT.mkdir(exist_ok=True)


def make_sharp_face_image():
    """A clear frame with two simple face-like shapes, sharp enough to pass
    the quality check and detectable enough to test blurring. Brightness and
    texture are kept in a realistic mid range, not washed out."""
    img = np.full((480, 640, 3), 150, dtype=np.uint8)

    # background texture so Laplacian variance reflects a real photo, not a
    # flat fill
    checker = np.indices((480, 640)).sum(axis=0) % 16 < 8
    img[checker] = img[checker] - 12

    for cx, cy in [(200, 220), (440, 240)]:
        cv2.circle(img, (cx, cy), 70, (190, 170, 150), -1)
        cv2.circle(img, (cx - 25, cy - 15), 8, (30, 30, 30), -1)
        cv2.circle(img, (cx + 25, cy - 15), 8, (30, 30, 30), -1)
        cv2.ellipse(img, (cx, cy + 30), (25, 12), 0, 0, 180, (50, 30, 30), 3)

    noise = np.random.randint(0, 20, img.shape, dtype=np.uint8)
    img = cv2.add(img, noise)
    path = str(OUT / "sample_sharp.jpg")
    cv2.imwrite(path, img)
    return path


def make_blurry_image():
    sharp_path = make_sharp_face_image()
    img = cv2.imread(sharp_path)
    blurred = cv2.GaussianBlur(img, (35, 35), 20)
    path = str(OUT / "sample_blurry.jpg")
    cv2.imwrite(path, blurred)
    return path


def make_dark_image():
    img = np.full((480, 640, 3), 15, dtype=np.uint8)
    path = str(OUT / "sample_dark.jpg")
    cv2.imwrite(path, img)
    return path


def make_motion_video():
    """A short clip that is calm for the first third, then has a burst of
    camera shake (whole frame shifting), then settles again. This mirrors
    what an incident might actually look like on a phone camera, and gives
    a genuinely strong optical flow signal during the burst."""
    path = str(OUT / "sample_motion.mp4")
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(path, fourcc, 15, (640, 480))

    base = np.full((600, 760, 3), 140, dtype=np.uint8)
    checker = np.indices((600, 760)).sum(axis=0) % 20 < 10
    base[checker] = base[checker] - 35
    cv2.circle(base, (380, 300), 60, (150, 120, 200), -1)
    cv2.rectangle(base, (100, 400), (300, 550), (100, 160, 140), -1)

    offset_x, offset_y = 40, 40
    for frame_num in range(45):
        if frame_num < 15:
            dx, dy = 0, 0
        elif frame_num < 25:
            dx = np.random.randint(-40, 40)
            dy = np.random.randint(-40, 40)
        else:
            dx, dy = 0, 0

        x = np.clip(offset_x + dx, 0, 120)
        y = np.clip(offset_y + dy, 0, 120)
        frame = base[y:y + 480, x:x + 640].copy()
        noise = np.random.randint(0, 10, frame.shape, dtype=np.uint8)
        frame = cv2.add(frame, noise)
        writer.write(frame)

    writer.release()
    return path


if __name__ == "__main__":
    print("sharp:", make_sharp_face_image())
    print("blurry:", make_blurry_image())
    print("dark:", make_dark_image())
    print("motion video:", make_motion_video())
