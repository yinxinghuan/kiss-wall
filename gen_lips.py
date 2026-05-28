#!/usr/bin/env python3
"""
Generate 6 FLAT photoreal kiss-mark PNGs for Kiss Wall via wdabuliu img2img.

The previous attempt produced 3D sculpted lipstick lips because both the ref
image (solid red lip-shape) and the prompts ("glossy 3D wax") pushed the
model that way. This version uses:

  1. A SMUDGY abstract ref (multiple low-alpha pinkish blobs on white paper)
     so the model has no 3D-object structure to latch onto.
  2. Prompts that explicitly frame the target as a FLAT IMPRINT, RUBBER
     STAMP MARK, photographed top-down, NOT a 3D rendered object.
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
REF_PATH = "/Users/yin/code/games/kiss-wall/_refs/lip_ref.png"
API_URL = "http://aiservice.wdabuliu.com:8019/genl_image"
API_TIMEOUT = 120
USER_ID = "yin"

PROMPTS = [
    "ultra realistic macro photograph of a single flat lipstick kiss imprint pressed onto plain white paper, top-down view from directly above, like a rubber stamp ink mark made by lips, smudgy uneven cherry-red wax edges, visible vertical lip-line texture inside the shape, NO 3D rendering, NOT sculpted lips, just a flat 2D printed ink-like shape on paper, isolated, white background, studio overhead lighting, sharp focus",
    "macro photograph of a single flat dark burgundy lipstick kiss imprint on white paper, top-down, pressed firmly leaving crisp imprint edges with visible lip ridges, flat 2D stamp not 3D, like a rubber stamp ink mark, isolated single mark, white paper background, photograph not render",
    "ultra realistic photo of a single coral-pink lipstick imprint smudged on white paper, top-down view, flat 2D wax stain in the shape of pressed lips, slightly asymmetric, NO sculpting, NO 3D lipstick object, just the flat stamp mark left behind, isolated, white background",
    "macro photograph of a single rose-red flat lipstick imprint on white paper, top-down, pressed lips left a smudgy wax-ink mark, fine vertical lip lines visible in texture, flat 2D not sculpted, like a rubber stamp print, isolated single mark, white paper, studio lighting",
    "real photograph of a single bright pink lipstick kiss imprint on white paper, top-down view, flat 2D wax stamp, no 3D lips object, just the flat impression left by pressed lips, slightly faded edges, isolated, white paper background, macro detail",
    "macro photograph of a single matte wine-red kiss imprint stamped on white paper, top-down, flat 2D imprint not a 3D lipstick, slightly tilted left, smudgy edges, visible lip-line texture, like a rubber stamp ink, isolated single mark, white paper background",
]


def draw_smudgy_ref(path: str) -> None:
    """Draw a smudgy abstract kiss-shape on white paper as img2img ref.

    Not a solid red lip-object — a vague pink/red wax stain with irregular
    edges that the model can flatten further. White paper background.
    """
    random.seed(7)
    W, H = 768, 512
    img = Image.new("RGB", (W, H), (252, 250, 246))  # off-white paper
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    cx, cy = W // 2, H // 2

    # upper lip cluster
    for _ in range(70):
        angle = random.uniform(0, 2 * math.pi)
        rx_outer = 130 + random.uniform(-25, 25)
        ry_outer = 36
        bx = cx + math.cos(angle) * rx_outer * 0.95
        by = cy - 30 + math.sin(angle) * ry_outer
        radius = random.randint(14, 32)
        alpha = random.randint(70, 160)
        d.ellipse((bx - radius, by - radius, bx + radius, by + radius),
                  fill=(170, 30, 56, alpha))

    # lower lip cluster (slightly larger area)
    for _ in range(85):
        angle = random.uniform(0, 2 * math.pi)
        rx_outer = 155 + random.uniform(-30, 30)
        ry_outer = 32
        bx = cx + math.cos(angle) * rx_outer * 0.92
        by = cy + 36 + math.sin(angle) * ry_outer
        radius = random.randint(14, 30)
        alpha = random.randint(70, 160)
        d.ellipse((bx - radius, by - radius, bx + radius, by + radius),
                  fill=(160, 28, 52, alpha))

    # soft blur for "smudge"
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=10))
    img.paste(overlay, (0, 0), overlay)

    # subtle paper grain noise
    grain = Image.new("L", (W, H))
    g = grain.load()
    for y in range(H):
        for x in range(W):
            g[x, y] = random.randint(245, 255)
    grain = grain.filter(ImageFilter.GaussianBlur(radius=0.6))
    img_arr = img.convert("RGB")
    img = Image.composite(img_arr,
                          Image.new("RGB", (W, H), (252, 250, 246)),
                          grain)

    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG")
    print(f"ref saved → {path}")


def upload_ref(_path: str) -> str:
    return "https://raw.githubusercontent.com/yinxinghuan/kiss-wall/master/_refs/lip_ref.png"


def call_api(ref_url: str, prompt: str):
    payload = json.dumps({
        "query": "",
        "params": {"url": ref_url, "prompt": prompt, "user_id": USER_ID},
    }).encode()
    req = urllib.request.Request(API_URL, data=payload,
                                 headers={"Content-Type": "application/json"},
                                 method="POST")
    try:
        with urllib.request.urlopen(req, timeout=API_TIMEOUT) as resp:
            r = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            r = json.loads(body)
        except Exception:
            return None
    code = r.get("code")
    if code == 200:
        return r["url"]
    if code == 429:
        raise RuntimeError("rate_limit")
    print(f"  ✗ API code={code} body={r}")
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
    draw_smudgy_ref(REF_PATH)
    ref_url = upload_ref(REF_PATH)
    print(f"  using ref → {ref_url}")
    print("  (push _refs/lip_ref.png to GitHub before running!)\n")
    for i, prompt in enumerate(PROMPTS, start=1):
        out = f"{PUBLIC_DIR}/lip-{i}.png"
        if os.path.exists(out):
            print(f"[{i}] skip (exists): {out}")
            continue
        print(f"\n[{i}/{len(PROMPTS)}] {prompt[:90]}…")
        attempts = 0
        while True:
            try:
                url = call_api(ref_url, prompt)
                if url:
                    download(url, out)
                    sz = os.path.getsize(out) // 1024
                    print(f"  ✓ raw → {out}  ({sz} KB)")
                    break
                else:
                    print("  ✗ no url returned, retry…")
                    attempts += 1
                    if attempts > 2:
                        break
                    time.sleep(8)
            except RuntimeError as e:
                if "rate_limit" in str(e):
                    print("  ⏳ rate limit, waiting 80s…")
                    time.sleep(80)
                else:
                    raise
        if i < len(PROMPTS):
            print("  ⏳ sleeping 80s before next call…")
            time.sleep(80)
    print("\nDone. Now run post-process step (rembg) to extract transparent lips.")


if __name__ == "__main__":
    main()
