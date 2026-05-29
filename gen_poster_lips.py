#!/usr/bin/env python3
"""
Generate 4 photoreal 3D-sculpted lipstick imprint PNGs FOR THE POSTER ONLY.

Uses the original gen_lips.py prompts (glossy 3D wax with dramatic lighting)
+ a solid-shape ref (not the smudgy one) so the model leans into the
volumetric 3D look the user remembered as visually striking.

These are SEPARATE from the in-game flat lips (lip-1..6.png) — stored as
poster-lip-1..4.png so they don't conflict.

Run: python3 gen_poster_lips.py
"""

import json
import math
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error

from PIL import Image, ImageDraw, ImageFilter

PUBLIC_DIR = "/Users/yin/code/games/kiss-wall/public"
REF_PATH = "/Users/yin/code/games/kiss-wall/_refs/poster_lip_ref.png"
API_URL = "http://aiservice.wdabuliu.com:8019/genl_image"
API_TIMEOUT = 180
USER_ID = "yin"
REF_GH_URL = "https://raw.githubusercontent.com/yinxinghuan/kiss-wall/master/_refs/poster_lip_ref.png"

PROMPTS = [
    "extreme macro photograph of beautiful real human lips wearing dark cherry red lipstick, real skin texture with visible natural lip creases and fine wrinkles, soft natural lighting that shows the anatomical dimension of the lips, slightly parted, sensual and realistic, isolated lips against pure black background, photoreal portrait macro, NOT plastic, NOT 3D rendered, real photo of skin and lipstick",
    "macro photograph of full sensual human lips with deep burgundy lipstick perfectly applied, real skin texture with subtle vertical lip wrinkles and fine pores, natural soft side lighting that brings out the anatomical depth of the lips themselves (not from plastic gloss), real human anatomy, isolated lips against pure black background, photoreal photography, NOT a 3D render, NOT plastic",
    "extreme close-up real photograph of pouty human lips wearing matte wine-red lipstick, visible skin pores and fine vertical lip creases, the lips have natural three-dimensional shape through soft natural lighting on real skin, anatomical realism, isolated against pure black background, real macro photo not render, NOT plastic looking",
    "macro portrait photograph of feminine lips with vivid coral-pink lipstick application, real skin texture with subtle creases, slightly parted, natural lighting catching the gentle anatomical dimension of soft human lips, photoreal anatomical depth without any plastic or shiny artificial effect, isolated lips against pure black background, real photo not render",
]


def draw_solid_ref(path: str) -> None:
    """Draw a solid red lip shape on green chroma — the original ref that
    pushed the model toward sculpted 3D lipstick output."""
    W, H = 768, 512
    img = Image.new("RGB", (W, H), (0, 255, 0))  # pure green chroma
    d = ImageDraw.Draw(img)
    cx, cy = W // 2, H // 2
    rx, ry = 220, 130
    # upper lip — two arcs forming a heart-with-flat-bottom
    d.pieslice((cx - rx, cy - ry - 30, cx - 20, cy + 40), 180, 360, fill=(180, 18, 38))
    d.pieslice((cx + 20, cy - ry - 30, cx + rx, cy + 40), 180, 360, fill=(180, 18, 38))
    d.polygon([(cx - rx, cy - 20), (cx + rx, cy - 20), (cx + rx, cy + 10), (cx, cy + 30), (cx - rx, cy + 10)], fill=(180, 18, 38))
    # lower lip — wide solid oval
    d.ellipse((cx - rx - 10, cy + 5, cx + rx + 10, cy + ry + 40), fill=(170, 20, 38))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG")
    print(f"  ref → {path}")


def call_api(ref_url, prompt, max_retries=3):
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
                time.sleep(30); continue
            return None
        code = r.get("code")
        if code == 200: return r["url"]
        if code == 429:
            print("  ⏳ rate limit, 80s…"); time.sleep(80); continue
        print(f"  ✗ API code={code} body={r}")
        if attempt < max_retries - 1: time.sleep(15); continue
        return None
    return None


def download(url, out):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
    tmp = out + ".tmp"
    with open(tmp, "wb") as f: f.write(data)
    subprocess.run(["sips","-s","format","png",tmp,"--out",out], check=True, capture_output=True)
    os.remove(tmp)


def main():
    if "--gen" not in sys.argv:
        draw_solid_ref(REF_PATH)
        print(f"\nNow push _refs/poster_lip_ref.png to GitHub, then re-run with --gen")
        return

    ref_url = REF_GH_URL
    print(f"using ref → {ref_url}\n")
    for i, prompt in enumerate(PROMPTS, start=1):
        out = f"{PUBLIC_DIR}/poster-lip-{i}.png"
        if os.path.exists(out):
            print(f"[{i}] skip (exists)")
            continue
        print(f"[{i}/{len(PROMPTS)}] {prompt[:80]}…")
        url = call_api(ref_url, prompt)
        if url:
            download(url, out)
            print(f"  ✓ {out}")
        else:
            print(f"  ✗ failed for {out}")
        if i < len(PROMPTS):
            print("  ⏳ 80s rate-limit…")
            time.sleep(80)
    print("\nDone. Run rembg post-process next.")


if __name__ == "__main__":
    main()
