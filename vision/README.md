# Selina Vision, OpenCV 5 safety evidence pipeline

The computer vision core of Selina's OpenCV AI Competition 2026 entry,
Agentic Vision path. It runs end to end on OpenCV 5.0.0 and has been tested
on synthetic media and one real photo, see Verified behavior below.

## What it does

A woman submits a photo or short video during or after an unsafe situation.
This pipeline:

1. Checks whether the submission is usable (not too dark, not too bright,
   not too blurry), and asks for a retake if not.
2. Blurs every face it detects before anything is stored or shared, to
   protect bystanders and other third parties.
3. For video, scans for sudden or repeated movement (camera shake, in
   effect) and flags it as worth a closer look. This is a prioritization
   signal for a human reviewer, not a claim about what happened.
4. Pulls one clear key frame out of a video clip for the incident record.
5. Returns a next action for the Safety Agent (add to timeline, raise
   priority for review, or request a retake). The vision output changes
   what happens next, which is what makes this an agentic workflow.

## Setup

Python 3.12.

```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Dependencies are pinned: `opencv-python-headless==5.0.0.93`, `numpy==2.5.4`.

Face detection uses the YuNet model through `cv2.FaceDetectorYN`. The Haar
cascade classifier is not in the OpenCV 5 main package, so it is not used.
Download the model once:

```
curl -L -o selina_vision/models/face_detection_yunet_2023mar.onnx https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx
```

OpenCV prints a "Targets are not supported by the new graph engine" warning
when the detector loads. It is harmless.

## Running it

Generate synthetic sample media (the repo contains no real incident
footage), then run the tests:

```
python tests/make_sample_data.py
python tests/test_pipeline.py
```

If a `face.png` photo is in the `vision` folder, the test also checks that
the face gets blurred. The file is git-ignored. Without it, that check is skipped.

## Verified behavior

Run on OpenCV 5.0.0.93:

| Sample | Quality result | Action returned |
|---|---|---|
| Sharp synthetic photo (no faces) | Usable | `add_to_timeline`, 0 faces blurred |
| Blurry photo | Flagged, too blurry | `request_retake` |
| Dark photo | Flagged, too dark | `request_retake` |
| Video with a shake burst | Usable key frame | `raise_priority_for_review`, motion flagged |
| Real portrait photo (1024x1536) | Usable | `add_to_timeline`, 1 face blurred |

## Known limitations

- Large photos are shrunk to 640 px on the long side before face detection.
  At full size the detector missed the face on the test photo. Boxes are
  scaled back up before blurring.
- The detection threshold is 0.6. Lower catches more faces but blurs more
  false ones. Small, side-on, masked or heavily shadowed faces can still be
  missed. A missed face is a privacy failure, so a human reviews every
  result before anything is shared.
- Thresholds for blur, brightness and motion were tuned on synthetic
  samples and one portrait. They need checking on real phone footage.
- Motion analysis uses frame differencing. It flags camera shake, it does
  not know what caused it.

## Deploying on AWS

`selina_vision/lambda_handler.py` wraps `process_image` and `process_video`
for an arm64 Lambda container image (`Dockerfile`). The handler has not yet
been run on a Lambda runtime or S3 bucket.