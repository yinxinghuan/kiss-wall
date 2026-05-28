// v2.3 — photoreal FLAT lipstick kiss-mark PNGs at public/lip-{1..6}.png.
//
// Generated via wdabuliu img2img (gen_lips.py) using a smudgy abstract ref
// and prompts explicitly framing the target as "flat 2D imprint, top-down,
// rubber stamp ink mark, NOT 3D sculpted lips". Background removed with
// rembg + alpha matting → transparent PNGs.

export const LIP_COUNT = 6;

interface LipProps {
  variant: number;
}

export function Lip({ variant }: LipProps) {
  const n = ((variant % LIP_COUNT) + LIP_COUNT) % LIP_COUNT + 1; // 1..6
  const src = `${import.meta.env.BASE_URL}lip-${n}.png`;
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="kw-lip-img"
      aria-hidden="true"
    />
  );
}
