"""
AWS Lambda handler for the Selina vision pipeline, served through a Lambda
Function URL. A GET returns a small upload page. A POST with an image or a
short video returns the pipeline result as JSON, including the face blurred
image so the page can show it.

Privacy rule: the original upload is never sent back. Only the face blurred
version is returned or stored.
"""

import base64
import json
import os
import tempfile
import urllib.request
import uuid

import cv2

from selina_vision.pipeline import process_image, process_video, evidence_to_action

RESULTS_BUCKET = os.environ.get("SELINA_EVIDENCE_BUCKET", "")
# Selina backend (Safety Agent). When set, the vision result is sent on as an
# evidence_processed event and the agent's decision is returned with it.
BACKEND_URL = os.environ.get("SELINA_BACKEND_URL", "").rstrip("/")
BACKEND_TIMEOUT = 45  # the free backend host can take a while to wake up
PREVIEW_MAX_SIDE = 900

_PAGE_PATH = os.path.join(os.path.dirname(__file__), "upload_page.html")


def handler(event, context):
    method = (
        event.get("requestContext", {}).get("http", {}).get("method")
        or event.get("httpMethod")
        or "POST"
    ).upper()

    if method == "GET":
        with open(_PAGE_PATH, "r", encoding="utf-8") as f:
            return {
                "statusCode": 200,
                "headers": {"Content-Type": "text/html; charset=utf-8"},
                "body": f.read(),
            }

    try:
        kind = (event.get("queryStringParameters") or {}).get("kind", "image")
        if kind not in ("image", "video"):
            return _response(400, {"error": f"Unknown kind: {kind}"})

        body = event.get("body") or ""
        if event.get("isBase64Encoded"):
            raw_bytes = base64.b64decode(body)
        else:
            raw_bytes = body.encode("utf-8")
        if not raw_bytes:
            return _response(400, {"error": "Empty upload"})

        with tempfile.TemporaryDirectory() as tmp_dir:
            suffix = ".jpg" if kind == "image" else ".mp4"
            input_path = os.path.join(tmp_dir, f"submission{suffix}")
            with open(input_path, "wb") as f:
                f.write(raw_bytes)

            if kind == "image":
                result = process_image(input_path, tmp_dir)
            else:
                result = process_video(input_path, tmp_dir)

            action = evidence_to_action(result)
            output_path = result.face_blur.output_path if result.face_blur else None

            stored_key = None
            if output_path and RESULTS_BUCKET:
                import boto3  # imported here so local runs do not need it

                stored_key = f"evidence/{uuid.uuid4()}.jpg"
                boto3.client("s3").upload_file(output_path, RESULTS_BUCKET, stored_key)

            return _response(200, {
                "kind": kind,
                "quality": {
                    "is_usable": result.quality.is_usable,
                    "reason": result.quality.reason,
                    "blur_variance": round(float(result.quality.blur_variance), 1),
                    "mean_brightness": round(float(result.quality.mean_brightness), 1),
                },
                "faces_blurred": result.face_blur.faces_blurred if result.face_blur else None,
                "motion": (
                    {
                        "flagged": result.motion.flagged,
                        "mean_motion": round(result.motion.mean_motion, 2),
                        "peak_magnitude": round(result.motion.peak_magnitude, 2),
                    }
                    if result.motion else None
                ),
                "notes": result.notes,
                "next_action": action,
                "safety_agent": _ask_safety_agent(action, stored_key),
                "stored_key": stored_key,
                "blurred_image_b64": _preview(output_path),
            })

    except Exception as exc:  # noqa: BLE001, a Lambda handler should not crash the invocation
        return _response(500, {"error": str(exc)})


def _ask_safety_agent(action, stored_key):
    """Hand the vision result to the Safety Agent and return what it decided.
    The Lambda temp path in the action means nothing to the backend, so it is
    swapped for the stored key (or dropped). A failure here never breaks the
    vision result, it is reported back instead."""
    if not BACKEND_URL:
        return None
    evidence_action = {k: v for k, v in action.items() if k != "evidence_path"}
    if stored_key:
        evidence_action["evidence_path"] = stored_key
    payload = json.dumps({"type": "evidence_processed", "evidence_action": evidence_action}).encode()
    req = urllib.request.Request(
        f"{BACKEND_URL}/event", data=payload, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=BACKEND_TIMEOUT) as resp:
            return json.loads(resp.read().decode())
    except Exception as exc:  # noqa: BLE001
        return {"error": f"Safety Agent unreachable: {exc}"}


def _preview(path):
    """Face blurred image, shrunk and encoded for the page. None when the
    submission was bounced for a retake (nothing is returned in that case)."""
    if not path:
        return None
    image = cv2.imread(path)
    if image is None:
        return None
    h, w = image.shape[:2]
    scale = min(1.0, PREVIEW_MAX_SIDE / max(h, w))
    if scale < 1.0:
        image = cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    ok, buf = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buf.tobytes()).decode("ascii") if ok else None


def _response(status_code, body_dict):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body_dict),
    }