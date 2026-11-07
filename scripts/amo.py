#!/usr/bin/env python3
"""Query Mozilla Add-ons (AMO) for this extension's versions and download signed XPIs.

Reads credentials from WEB_EXT_API_KEY / WEB_EXT_API_SECRET (source ~/.amo-keys first).

  scripts/amo.py status                 # list all versions + signing status
  scripts/amo.py download VERSION DIR   # save the signed XPI for VERSION into DIR
"""
import base64
import hashlib
import hmac
import json
import os
import pathlib
import sys
import time
import urllib.request
import uuid

API = "https://addons.mozilla.org/api/v5/addons/addon"
MANIFEST = pathlib.Path(__file__).resolve().parent.parent / "manifest.json"


def b64(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=")


def token():
    key, secret = os.environ["WEB_EXT_API_KEY"], os.environ["WEB_EXT_API_SECRET"]
    now = int(time.time())
    header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = b64(json.dumps({"iss": key, "jti": str(uuid.uuid4()), "iat": now, "exp": now + 60}).encode())
    sig = b64(hmac.new(secret.encode(), header + b"." + payload, hashlib.sha256).digest())
    return (header + b"." + payload + b"." + sig).decode()


def fetch(url):
    req = urllib.request.Request(url, headers={"Authorization": "JWT " + token()})
    return urllib.request.urlopen(req).read()


def versions():
    addon_id = json.loads(MANIFEST.read_text())["browser_specific_settings"]["gecko"]["id"]
    data = json.loads(fetch(f"{API}/{urllib.request.quote(addon_id)}/versions/?filter=all_with_unlisted"))
    return data["results"]


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd == "status":
        for v in versions():
            print(v["version"], v["channel"], v["file"]["status"], v["file"]["url"], sep="\t")
    elif cmd == "download":
        version, out_dir = sys.argv[2], pathlib.Path(sys.argv[3])
        match = next((v for v in versions() if v["version"] == version), None)
        if not match:
            sys.exit(f"version {version} not found on AMO")
        if match["file"]["status"] != "public":
            sys.exit(f"version {version} is not signed yet (status: {match['file']['status']})")
        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / f"yt-windowed-{version}-signed.xpi"
        out.write_bytes(fetch(match["file"]["url"]))
        print(out)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
