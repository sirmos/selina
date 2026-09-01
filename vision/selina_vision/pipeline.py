"""
Selina Safety Evidence pipeline.

Turns a photo or short video clip into structured, privacy protected evidence
for the Safety Agent. This module is the OpenCV 5 core of the Selina entry
for the OpenCV AI Competition 2026, Agentic Vision path.

The pipeline output is meant to change what the Safety Agent does next
(raise priority, ask for a retake, prepare a clearer escalation), not just
describe the image. See evidence_to_action() at the bottom for that step.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
import os

import cv2
import numpy as np

# OpenCV 5 moved CascadeClassifier (Haar based) out of the core package into
# opencv_contrib's xobjdetect module. Rather than pull in contrib for a
# legacy detector, this uses the DNN based face detector OpenCV's own
# migration guide recommends instead, faster and more accurate, and still
# in the main package.
#
# The model file is not bundled here (small, but a binary asset), download
# it once with:
#   curl -L -o selina_vision/models/face_detection_yunet_2023mar.onnx \
#     https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx
FACE_DETECTOR_MODEL_PATH = os.environ.get(
    "SELINA_FACE_MODEL_PATH",
    str(Path(__file__).parent / "models" / "face_detection_yunet_2023mar.onnx"),
)

# Thresholds, tuned to be conservative rather than clever. False negatives
# (missing a real problem) are worse than false positives here, since a
# human always reviews the result before anything is shared or escalated.
BLUR_VARIANCE_THRESHOLD = 100.0   # below this, the image is treated as too blurry
DARK_MEAN_THRESHOLD = 40.0        # below this, the image is treated as too dark
BRIGHT_MEAN_THRESHOLD = 220.0     # above this, treated as blown out
MOTION_FLAG_THRESHOLD = 4.0        # peak mean pixel difference that counts as notable
# Based on simple frame differencing, not optical flow, see analyze_motion
# for why. Calibrated against tests/make_sample_data.py's deterministic
# shake burst: ambient frames there measure 0.4 to 2.9, the burst frames
# measure 5.2 to 7.1, a clear gap with this threshold sitting in the
# middle of it. Recalibrate against real phone footage before the actual
# demo, synthetic motion is a reasonable proxy, not a substitute.


@dataclass
class QualityReport:
    is_usable: bool
    blur_variance: float
    mean_brightness: float
    reason: Optional[str] = None


@dataclass
class FaceBlurResult:
    output_path: str
    faces_blurred: int


@dataclass
class MotionReport:
    flagged: bool
    mean_motion: float
    peak_magnitude: float = 0.0
    peak_frame_index: Optional[int] = None


@dataclass
class EvidenceResult:
    source_path: str
    quality: QualityReport
    face_blur: Optional[FaceBlurResult] = None
    motion: Optional[MotionReport] = None
    key_frame_path: Optional[str] = None
    notes: list = field(default_factory=list)


def check_quality(image: np.ndarray) -> QualityReport:
    """Flag images that are too blurry or too poorly exposed to be useful,
    so the person is asked to retake rather than silently keeping a bad
    submission in the record."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur_variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    mean_brightness = float(np.mean(gray))

    if mean_brightness < DARK_MEAN_THRESHOLD:
        return QualityReport(False, blur_variance, mean_brightness, "too dark")
    if mean_brightness > BRIGHT_MEAN_THRESHOLD:
        return QualityReport(False, blur_variance, mean_brightness, "overexposed")
    if blur_variance < BLUR_VARIANCE_THRESHOLD:
        return QualityReport(False, blur_variance, mean_brightness, "too blurry")

    return QualityReport(True, blur_variance, mean_brightness, None)


def blur_faces(image: np.ndarray, output_path: str) -> FaceBlurResult:
    """Detect faces and blur them before anything leaves the pipeline, so
    bystanders and other third parties are not exposed. This runs on every
    submission, there is no option to skip it."""
    if not Path(FACE_DETECTOR_MODEL_PATH).exists():
        raise FileNotFoundError(
            f"Face detection model not found at {FACE_DETECTOR_MODEL_PATH}. "
            "Download it first, see the comment at the top of this file for "
            "the exact command."
        )

    height, width = image.shape[:2]
    detector = cv2.FaceDetectorYN.create(FACE_DETECTOR_MODEL_PATH, "", (width, height))
    _, faces = detector.detect(image)

    output = image.copy()
    faces_blurred = 0

    if faces is not None:
        for face in faces:
            x, y, w, h = face[:4].astype(int)
            x, y = max(x, 0), max(y, 0)
            w, h = max(w, 1), max(h, 1)
            region = output[y:y + h, x:x + w]
            if region.size == 0:
                continue
            blurred = cv2.GaussianBlur(region, (51, 51), 30)
            output[y:y + h, x:x + w] = blurred
            faces_blurred += 1

    cv2.imwrite(output_path, output)
    return FaceBlurResult(output_path, faces_blurred)


def analyze_motion(video_path: str) -> MotionReport:
    """Scan a short clip for sudden or repeated movement. This is a
    prioritization signal for human review, not a claim about what
    happened, and it is described that way anywhere it surfaces.

    Uses simple frame differencing rather than optical flow. Optical flow
    (Farneback) is built to track smooth, small to moderate motion, an
    abrupt shake or sudden jolt produces a displacement too large for it
    to track well, and it can under-report exactly the thing we're trying
    to catch. Frame differencing has no such blind spot, a sudden change
    shows up directly as a large pixel difference."""
    cap = cv2.VideoCapture(video_path)
    ok, prev = cap.read()
    if not ok:
        cap.release()
        return MotionReport(False, 0.0)

    prev_gray = cv2.cvtColor(prev, cv2.COLOR_BGR2GRAY)
    diffs = []
    frame_index = 0
    peak_frame_index = 0
    peak_diff = 0.0

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        frame_index += 1
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        diff = cv2.absdiff(prev_gray, gray)
        mean_diff = float(np.mean(diff))
        diffs.append(mean_diff)
        if mean_diff > peak_diff:
            peak_diff = mean_diff
            peak_frame_index = frame_index
        prev_gray = gray

    cap.release()

    if not diffs:
        return MotionReport(False, 0.0)

    mean_motion = float(np.mean(diffs))
    return MotionReport(
        flagged=peak_diff > MOTION_FLAG_THRESHOLD,
        mean_motion=mean_motion,
        peak_magnitude=peak_diff,
        peak_frame_index=peak_frame_index,
    )


def extract_key_frame(video_path: str, output_path: str, target_frame_index: Optional[int] = None) -> str:
    """Pull one clear, representative frame out of a clip, so the incident
    timeline stores a single usable image rather than a raw video nobody
    has time to review."""
    cap = cv2.VideoCapture(video_path)
    frame_index = 0
    best_frame = None
    best_score = -1.0

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        if target_frame_index is not None:
            if frame_index == target_frame_index:
                best_frame = frame
                break
        else:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            score = cv2.Laplacian(gray, cv2.CV_64F).var()
            if score > best_score:
                best_score = score
                best_frame = frame

        frame_index += 1

    cap.release()

    if best_frame is None:
        raise ValueError(f"Could not read any frames from {video_path}")

    cv2.imwrite(output_path, best_frame)
    return output_path


def process_image(image_path: str, output_dir: str) -> EvidenceResult:
    """Full pipeline for a single photo submission."""
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Could not read image at {image_path}")

    quality = check_quality(image)
    result = EvidenceResult(source_path=image_path, quality=quality)

    if not quality.is_usable:
        result.notes.append(f"Flagged for retake: {quality.reason}")
        return result

    blurred_path = str(Path(output_dir) / f"blurred_{Path(image_path).name}")
    result.face_blur = blur_faces(image, blurred_path)
    result.notes.append(f"{result.face_blur.faces_blurred} face(s) blurred before storage")

    return result


def process_video(video_path: str, output_dir: str) -> EvidenceResult:
    """Full pipeline for a short video submission: quality check on the key
    frame, motion analysis across the clip, key frame extraction, then face
    blurring on that frame before it is stored."""
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    motion = analyze_motion(video_path)
    key_frame_path = str(Path(output_dir) / f"keyframe_{Path(video_path).stem}.jpg")
    extract_key_frame(video_path, key_frame_path, target_frame_index=motion.peak_frame_index)

    key_frame_image = cv2.imread(key_frame_path)
    quality = check_quality(key_frame_image)

    result = EvidenceResult(
        source_path=video_path,
        quality=quality,
        motion=motion,
        key_frame_path=key_frame_path,
    )

    if motion.flagged:
        result.notes.append(f"Notable movement pattern detected, mean magnitude {motion.mean_motion:.2f}")

    if not quality.is_usable:
        result.notes.append(f"Key frame flagged for retake: {quality.reason}")
        return result

    blurred_path = str(Path(output_dir) / f"blurred_{Path(key_frame_path).name}")
    result.face_blur = blur_faces(key_frame_image, blurred_path)
    result.notes.append(f"{result.face_blur.faces_blurred} face(s) blurred before storage")

    return result


def evidence_to_action(result: EvidenceResult) -> dict:
    """This is the step that satisfies the Agentic Vision requirement: the
    vision result changes what happens next, it does not just describe the
    image. Returns the next action the Safety Agent should take."""
    if not result.quality.is_usable:
        return {
            "action": "request_retake",
            "reason": result.quality.reason,
        }

    if result.motion and result.motion.flagged:
        return {
            "action": "raise_priority_for_review",
            "reason": "movement pattern worth a closer look",
            "evidence_path": result.face_blur.output_path if result.face_blur else result.key_frame_path,
        }

    return {
        "action": "add_to_timeline",
        "reason": "usable evidence, no motion flag raised",
        "evidence_path": result.face_blur.output_path if result.face_blur else result.key_frame_path,
    }
