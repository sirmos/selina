import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from selina_vision.pipeline import process_image, process_video, evidence_to_action

SAMPLE_DIR = Path(__file__).parent.parent / "sample_data"
OUTPUT_DIR = Path(__file__).parent.parent / "pipeline_output"


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
    return result


if __name__ == "__main__":
    run_case("sharp image", process_image, str(SAMPLE_DIR / "sample_sharp.jpg"), str(OUTPUT_DIR))
    run_case("blurry image", process_image, str(SAMPLE_DIR / "sample_blurry.jpg"), str(OUTPUT_DIR))
    run_case("dark image", process_image, str(SAMPLE_DIR / "sample_dark.jpg"), str(OUTPUT_DIR))
    run_case("motion video", process_video, str(SAMPLE_DIR / "sample_motion.mp4"), str(OUTPUT_DIR))

    print("\nAll cases ran without error.")
