"""
AWS Lambda handler for the vision pipeline. Meant to run on a Graviton
(arm64) Lambda, see Dockerfile in this same folder.

Expected event shape, from API Gateway with base64 encoded body:

{
    "body": "<base64 encoded image or video bytes>",
    "isBase64Encoded": true,
    "headers": {"content-type": "image/jpeg"},
    "queryStringParameters": {"kind": "image"}   # or "video"
}

Not yet tested against a real Lambda runtime or real S3 bucket, that needs
actual AWS credentials this environment does not have. The pipeline logic
itself (selina_vision.pipeline) is tested and verified separately, see
tests/test_pipeline.py, this file is the thin AWS-facing wrapper around it.
"""

import base64
import json
import os
import tempfile
import uuid

import boto3

from selina_vision.pipeline import process_image, process_video, evidence_to_action

RESULTS_BUCKET = os.environ.get("SELINA_EVIDENCE_BUCKET", "")
s3 = boto3.client("s3")


def handler(event, context):
    try:
        kind = (event.get("queryStringParameters") or {}).get("kind", "image")
        body = event.get("body", "")

        if event.get("isBase64Encoded"):
            raw_bytes = base64.b64decode(body)
        else:
            raw_bytes = body.encode("utf-8")

        with tempfile.TemporaryDirectory() as tmp_dir:
            suffix = ".jpg" if kind == "image" else ".mp4"
            input_path = os.path.join(tmp_dir, f"submission{suffix}")
            with open(input_path, "wb") as f:
                f.write(raw_bytes)

            if kind == "image":
                result = process_image(input_path, tmp_dir)
            elif kind == "video":
                result = process_video(input_path, tmp_dir)
            else:
                return _response(400, {"error": f"Unknown kind: {kind}"})

            action = evidence_to_action(result)

            # Upload the processed (face blurred) output to S3 if the
            # pipeline produced one and a bucket is configured, otherwise
            # skip the upload, useful for local testing without AWS creds.
            output_path = result.face_blur.output_path if result.face_blur else None
            stored_key = None
            if output_path and RESULTS_BUCKET:
                stored_key = f"evidence/{uuid.uuid4()}{suffix}"
                s3.upload_file(output_path, RESULTS_BUCKET, stored_key)

            return _response(200, {
                "quality": {
                    "is_usable": result.quality.is_usable,
                    "reason": result.quality.reason,
                },
                "motion": (
                    {
                        "flagged": result.motion.flagged,
                        "mean_motion": result.motion.mean_motion,
                    }
                    if result.motion else None
                ),
                "notes": result.notes,
                "next_action": action,
                "stored_key": stored_key,
            })

    except Exception as exc:  # noqa: BLE001, a Lambda handler should not crash the invocation
        return _response(500, {"error": str(exc)})


def _response(status_code, body_dict):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body_dict),
    }
