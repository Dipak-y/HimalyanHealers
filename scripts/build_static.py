"""
Render the Django site to plain static files for Netlify.

Netlify serves static files from the publish directory, so the Django
templates have to be rendered ahead of time. This script runs the real
views with minimal settings (no database or secret key required) and
writes the output, plus the static assets, into ``dist/``.
"""

import shutil
import sys
from pathlib import Path

import django
from django.conf import settings

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "dist"

sys.path.insert(0, str(BASE_DIR))

settings.configure(
    DEBUG=False,
    SECRET_KEY="static-build-only",
    ALLOWED_HOSTS=["*"],
    ROOT_URLCONF="himalyan.urls",
    INSTALLED_APPS=[
        "django.contrib.admin",
        "django.contrib.auth",
        "django.contrib.contenttypes",
        "django.contrib.sessions",
        "django.contrib.messages",
        "django.contrib.staticfiles",
    ],
    TEMPLATES=[
        {
            "BACKEND": "django.template.backends.django.DjangoTemplates",
            "DIRS": [BASE_DIR / "templates"],
            "APP_DIRS": True,
            "OPTIONS": {
                "context_processors": [
                    "django.template.context_processors.request",
                    "django.contrib.auth.context_processors.auth",
                    "django.contrib.messages.context_processors.messages",
                ],
            },
        },
    ],
    STATIC_URL="/static/",
    USE_TZ=True,
    TIME_ZONE="Asia/Kathmandu",
)
django.setup()

from django.contrib.auth.models import AnonymousUser  # noqa: E402
from django.test import RequestFactory  # noqa: E402

from himalyan.views import homePage  # noqa: E402

# Each entry maps an output file to the view that renders it.
PAGES = {
    "index.html": homePage,
}


def main():
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir(parents=True)

    factory = RequestFactory()
    for filename, view in PAGES.items():
        request = factory.get("/")
        request.user = AnonymousUser()
        response = view(request)
        (OUTPUT_DIR / filename).write_bytes(response.content)
        print(f"Rendered {filename}")

    shutil.copytree(BASE_DIR / "static", OUTPUT_DIR / "static")
    print(f"Copied static assets to {OUTPUT_DIR / 'static'}")


if __name__ == "__main__":
    main()
