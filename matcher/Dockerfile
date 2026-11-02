# syntax=docker/dockerfile:1
# Sample matcher: a private service the SpotOn app calls. Build context is matcher/.

# ---- deps: pinned wheels into a venv (PyAV ships its own minimal FFmpeg, so no apt packages) ----
FROM python:3.13-slim@sha256:2d44738ebf4ce5f63b9d9ea871e9c7cfdc0426f7b0c97cac915fd88ded1d86bb AS deps
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN python -m venv /venv
COPY requirements.txt .
RUN /venv/bin/pip install -r requirements.txt

# ---- test: CI builds this target; a failing test fails the build ----
FROM deps AS test
COPY requirements-test.txt .
RUN /venv/bin/pip install -r requirements-test.txt
WORKDIR /src
COPY samplematch ./samplematch
COPY tests ./tests
RUN /venv/bin/python -m pytest tests -q -p no:cacheprovider -W ignore::FutureWarning

# ---- runtime ----
FROM python:3.13-slim@sha256:2d44738ebf4ce5f63b9d9ea871e9c7cfdc0426f7b0c97cac915fd88ded1d86bb
# The service never installs anything: drop pip so its own dependencies aren't in the image.
RUN rm -rf /usr/local/lib/python3.13/site-packages/pip* /usr/local/bin/pip*
COPY --from=deps /venv /venv
RUN rm -rf /venv/lib/python3.13/site-packages/pip* /venv/bin/pip*
WORKDIR /app
# Code stays root-owned: the service user can read it but not change it.
COPY samplematch ./samplematch
ENV PATH=/venv/bin:$PATH PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PORT=8000 \
    NUMBA_CACHE_DIR=/tmp/numba
USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,os;urllib.request.urlopen(f'http://127.0.0.1:{os.environ[\"PORT\"]}/healthz',timeout=2)" || exit 1
CMD ["python", "-m", "samplematch.server"]
