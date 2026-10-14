# Lambda container image for the Selina vision pipeline (OpenCV 5.0.0).
#
# Build in AWS CloudShell, from the vision folder:
#   docker build --provenance=false -t selina-vision .
# Then push to ECR and point a Lambda function at the image. See README.

FROM public.ecr.aws/lambda/python:3.12

COPY requirements.txt .
RUN pip install -r requirements.txt --no-cache-dir

COPY selina_vision/ ./selina_vision/

# Download the YuNet face model at build time if it is not already in the repo
RUN python -c "import os, urllib.request; p='selina_vision/models/face_detection_yunet_2023mar.onnx'; os.makedirs('selina_vision/models', exist_ok=True); (os.path.exists(p) and os.path.getsize(p) > 100000) or urllib.request.urlretrieve('https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx', p)"

COPY upload_page.html ./selina_vision/upload_page.html

CMD ["selina_vision.lambda_handler.handler"]