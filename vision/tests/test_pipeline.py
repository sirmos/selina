import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from selina_vision.pipeline import process_image, process_video, evidence_to_action

ROOT = Path(__file__).parent.parent
SAMPLE_DIR = ROOT / "sample_data"
OUTPUT_DIR = ROOT / "pipeline_output"
FACE_PHOTO = ROOT / "face.png"  # local test photo, not committed


def run_case(label, fn, *args):
    print(f"\n--- {label} ---")
    result = fn(*args)
    print("quality:", result.quality)
    if result.face_blur:
        print("face blur:", result.face_blur)
    if result.motion:
        print("motion:", result.motion)
    if result.key_frame_path:
        print("key frame:", result.key_frame_path)
    print("notes:", result.notes)
    action = evidence_to_action(result)
    print("next action for the Safety Agent:", action)
    return result, action


def test_all():
    sharp, _ = run_case("sharp image", process_image, str(SAMPLE_DIR / "sample_sharp.jpg"), str(OUTPUT_DIR))
    assert sharp.quality.is_usable
    assert sharp.face_blur is not None

    _, action = run_case("blurry image", process_image, str(SAMPLE_DIR / "sample_blurry.jpg"), str(OUTPUT_DIR))
    assert action["action"] == "request_retake"

    _, action = run_case("dark image", process_image, str(SAMPLE_DIR / "sample_dark.jpg"), str(OUTPUT_DIR))
    assert action["action"] == "request_retake"

    video, _ = run_case("motion video", process_video, str(SAMPLE_DIR / "sample_motion.mp4"), str(OUTPUT_DIR))
    assert video.motion.flagged

    if FACE_PHOTO.exists():
        face, _ = run_case("photo with a face", process_image, str(FACE_PHOTO), str(OUTPUT_DIR))
        assert face.face_blur.faces_blurred >= 1, "face was not blurred"
    else:
        print("\nface.png not found, skipping the face blur check")


if __name__ == "__main__":
    test_all()
    print("\nAll checks passed.")