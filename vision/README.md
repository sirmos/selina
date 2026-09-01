# Selina Vision, OpenCV 5 safety evidence pipeline

The computer vision core of Selina's OpenCV AI Competition 2026 entry,
Agentic Vision path. This is a real, working pipeline, not a placeholder,
it has been run end to end against synthetic test media and behaves
correctly, see Verified behavior below.

## What it does

A woman submits a photo or short video during or after an unsafe situation.
This pipeline:

1. Checks whether the submission is usable (not too dark, not too bright,
   not too blurry), and asks for a retake if not.
2. Blurs every face in the frame that is detected, before anything is
   stored or shared further, to protect bystanders and other third parties.
3. For video, scans for sudden or repeated movement (camera shake, in
   effect) and flags it as worth a closer look, this is a prioritization
   signal for a human reviewer, not a claim about what happened.
4. Pulls one clear key frame out of a video clip for the incident record.
5. Returns a next action for the Safety Agent (add to timeline, raise
   priority for review, or request a retake), which is the step that makes
   this an agentic vision workflow rather than a chatbot describing a fixed
   result: the vision output changes what happens next.

## Setup

```
pip install -r requirements.txt
```

A note on the OpenCV version: this was built and verified against the
OpenCV build available during development (4.13). The competition
requires OpenCV 5. The API used throughout (CascadeClassifier, Laplacian,
calcOpticalFlowFarneback) is stable across both, but reinstall against the
actual OpenCV 5 release and rerun the test suite below before final
submission, do not assume it carries over untested.

## Running it

Generate synthetic sample media, since this repo intentionally contains no
real incident footage, then run the pipeline against it:

```
python tests/make_sample_data.py
python tests/test_pipeline.py
```

## Verified behavior

Running `test_pipeline.py` against the generated samples currently produces:

| Sample | Quality result | Action returned |
|---|---|---|
| Sharp photo, two faces | Usable | `add_to_timeline`, both faces blurred |
| Blurry photo | Flagged, too blurry | `request_retake` |
| Dark photo | Flagged, too dark | `request_retake` |
| Video with a shake burst | Usable key frame | `raise_priority_for_review`, motion flagged |

This confirms the core claim for the Agentic Vision path: the vision
output genuinely changes the next action, a good frame is filed, a bad one
is bounced back, and a suspicious clip is escalated in priority.

## Deploying on AWS

This module is written to run inside a container on AWS Graviton (EC2 or
Lambda), see the AWS Compute Grant proposal for the full architecture.
`selina_vision/lambda_handler.py` wraps `process_image` and `process_video`
for that deployment, and `Dockerfile` builds an arm64 Lambda container
image.

Honest status on the Lambda handler: it has not been run against a real
Lambda runtime or a real S3 bucket, `boto3` is not available in the
environment this was built in, so it could not be executed here. The
pipeline logic it wraps (`selina_vision.pipeline`) is fully tested, see
Verified behavior above, but the AWS-facing wrapper itself needs a real
test run with actual credentials before you trust it for the demo, budget
time for that.

## What still needs doing

- Swap the Haar cascade face detector for a more robust model if time
  allows, it works but is a dated method, a DNN-based detector would be
  more reliable on real, varied footage.
- Recalibrate `BLUR_VARIANCE_THRESHOLD`, `DARK_MEAN_THRESHOLD`, and
  `MOTION_FLAG_THRESHOLD` in `pipeline.py` against real phone camera
  footage, the current values are tuned against synthetic samples.
- Test `lambda_handler.py` against a real Lambda runtime and S3 bucket,
  this has not been run, only written.
- Connect `evidence_to_action` output into the Safety Agent, this is
  already done on the backend side, see `backend/agents/safety_agent.py`
  and `backend/README.md` for how the two connect.
- Reinstall against OpenCV 5 specifically and rerun `test_pipeline.py`.
