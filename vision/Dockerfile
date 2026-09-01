# Build for AWS Graviton (arm64), the core requirement for the Best Use of
# COOL award path and for keeping the OpenCV 5 workload on the Arm path.
#
# Build with: docker buildx build --platform linux/arm64 -t selina-vision .
# Push to ECR, then point a Lambda function (arm64 architecture) at the
# image, or run it on an EC2 Graviton instance behind API Gateway instead
# if a container image Lambda proves too slow for cold starts.

FROM public.ecr.aws/lambda/python:3.12-arm64

COPY requirements.txt .
RUN pip install -r requirements.txt --no-cache-dir

COPY selina_vision/ ./selina_vision/

CMD ["selina_vision.lambda_handler.handler"]
