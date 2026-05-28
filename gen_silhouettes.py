#!/usr/bin/env python3
"""
Generate 8 photoreal silhouette PNGs for Kiss Wall (replaces SVG paths).

Each form is rendered as a dramatic single-subject photo against pure black
background. rembg post-process extracts a clean alpha mask. The PNG serves
two purposes:
  1. visible ghost layer (faintly visible behind the kiss cluster, opacity
     scales with permanent kiss count)
  2. hit-test mask (alpha channel >threshold = inside silhouette region;
     kiss sticks. outside = transient)

Run: python3 gen_silhouettes.py
"""

import json
import math
import os
import random
import subprocess
import sys
import time
import urllib.request
import urllib.error

from PIL import Image, ImageDraw, ImageFilter

PUBLIC_DIR = "/Users/yin/code/games/kiss-wall/public"
REF_DIR = "/Users/yin/code/games/kiss-wall/_refs"
API_URL = "http://aiservice.wdabuliu.com:8019/genl_image"
API_TIMEOUT = 180
USER_ID = "yin"
REF_GH_BASE = "https://raw.githubusercontent.com/yinxinghuan/kiss-wall/master/_refs"

# slug + prompt + ref-shape-class (which simple ref to draw)
SILHOUETTES = [
    ("skull",  "ultra realistic macro photograph of a polished bone skull in side profile, facing right, dramatic single key light, isolated against pure black background, no other objects, sharp focus, photo not render", "tall-portrait"),
    ("heart",  "ultra realistic photograph of a single anatomical human heart with visible aorta and atria, dark crimson tissue, against pure black background, dramatic side light, isolated, sharp focus, photo not 3d render", "tall-portrait"),
    ("bust",   "photograph of a classical white marble bust of a young woman in profile (Venus / Greek antique style), against pure black background, soft single light, isolated, no other objects, photo not 3d render", "tall-portrait"),
    ("eye",    "extreme macro photograph of a single human eye with thick dramatic black mascara, a single dark tear streaking down the cheek, against pure black background, sharp focus on iris, isolated, photo not render", "wide-landscape"),
    ("hand",   "photograph of a single human hand reaching upward with fingers extended (like grasping at air), pale skin, against pure black background, dramatic single key light, isolated, no body visible, photo not render", "tall-portrait"),
    ("rose",   "photograph of a single deep red long-stem rose with leaves and visible thorns, lying or standing against pure black background, dramatic single light, isolated, photo not render", "tall-portrait"),
    ("veil",   "photograph of a woman's face profile covered by a delicate black lace mourning veil, lace pattern visible, against pure black background, dramatic single light, isolated, photo not render", "tall-portrait"),
    ("wings",  "photograph of a single pair of folded white angel feathered wings, soft feathers, against pure black background, dramatic single key light, isolated, no body, photo not 3d render", "tall-portrait"),
]


def draw_ref(slug: str, shape_class: str) -> str:
    """Draw a simple silhouette-shape ref hint on dark background.

    Keep it abstract: a soft white-on-dark blob roughly the silhouette of the
    target subject, blurred. The model uses it for compositional placement
    only — the prompt drives the actual subject."""
    random.seed(hash(slug) & 0xffff)
    if shape_class == "wide-landscape":
        W, H = 768, 512
    else:  # tall-portrait
        W, H = 512, 768
    img = Image.new("RGB", (W, H), (8, 8, 12))
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    cx, cy = W // 2, H // 2
    # tall central blob
    for _ in range(80):
        bx = cx + random.randint(-int(W*0.18), int(W*0.18))
        by = cy + random.randint(-int(H*0.30), int(H*0.30))
        r = random.randint(20, 60)
        a = random.randint(40, 160)
        d.ellipse((bx-r, by-r, bx+r, by+r), fill=(220, 215, 200, a))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=14))
    img.paste(overlay, (0, 0), overlay)
    path = f"{REF_DIR}/silh_{slug}_ref.png"
    os.makedirs(REF_DIR, exist_ok=True)
    img.save(path, "PNG")
    return path


def upload_ref(slug: str) -> str:
    # ref must already be pushed to GitHub raw before calling
    return f"{REF_GH_BASE}/silh_{slug}_ref.png"


def call_api(ref_url: str, prompt: str, max_retries: int = 3):
    """Call API with retry on TimeoutError / connection issues."""
    payload = json.dumps({
        "query": "",
        "params": {"url": ref_url, "prompt": prompt, "user_id": USER_ID},
    }).encode()
    for attempt in range(max_retries):
        req = urllib.request.Request(API_URL, data=payload,
                                     headers={"Content-Type": "application/json"},
                                     method="POST")
        try:
            with urllib.request.urlopen(req, timeout=API_TIMEOUT) as resp:
                r = json.loads(resp.read())
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            try: r = json.loads(body)
            except: return None
        except (TimeoutError, urllib.error.URLError) as e:
            print(f"  ⏳ network/timeout (attempt {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(30)
                continue
            return None
        code = r.get("code")
        if code == 200:
            return r["url"]
        if code == 429:
            raise RuntimeError("rate_limit")
        print(f"  ✗ API code={code} body={r}")
        if attempt < max_retries - 1:
            time.sleep(15)
            continue
        return None
    return None


def download(url: str, out: str) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
    tmp = out + ".tmp"
    with open(tmp, "wb") as f:
        f.write(data)
    subprocess.run(["sips", "-s", "format", "png", tmp, "--out", out],
                   check=True, capture_output=True)
    os.remove(tmp)


def main() -> None:
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    os.makedirs(REF_DIR, exist_ok=True)

    # Draw all refs first so user can git-push them in one go
    print("Drawing refs…")
    for slug, _, shape in SILHOUETTES:
        p = draw_ref(slug, shape)
        print(f"  {slug} → {p}")

    print("\nNOW: git add _refs && git commit && git push BEFORE proceeding.")
    print("Then re-run with --skip-ref-gen to gen images.\n")

    if "--skip-ref-gen" not in sys.argv:
        return

    for i, (slug, prompt, _) in enumerate(SILHOUETTES, start=1):
        out = f"{PUBLIC_DIR}/silh-{slug}.png"
        if os.path.exists(out):
            print(f"[{i}] skip (exists): {out}")
            continue
        ref_url = upload_ref(slug)
        print(f"\n[{i}/{len(SILHOUETTES)}] {slug}: {prompt[:80]}…")
        while True:
            try:
                url = call_api(ref_url, prompt)
                if url:
                    download(url, out)
                    sz = os.path.getsize(out) // 1024
                    print(f"  ✓ {out}  ({sz} KB)")
                    break
                else:
                    print("  ✗ no url; retry…")
                    time.sleep(8)
            except RuntimeError as e:
                if "rate_limit" in str(e):
                    print("  ⏳ rate limit, waiting 80s…")
                    time.sleep(80)
                else:
                    raise
        if i < len(SILHOUETTES):
            print("  ⏳ sleeping 80s…")
            time.sleep(80)
    print("\nAll silhouettes generated. Run rembg post-process next.")


if __name__ == "__main__":
    main()
