"""BananaVision online backend — serves the quantized .tflite with LiteRT,
and the per-stage content parsed from banana_stages.md.
Local run:  uvicorn app:app --host 0.0.0.0 --port 8000 --reload
On Hugging Face Spaces the Dockerfile runs it on port 7860.
"""
import io
import json
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ai_edge_litert.interpreter import Interpreter   # the light LiteRT runtime
from banana_content import load_stage_guide          # parses banana_stages.md

MAX_BYTES = 8 * 1024 * 1024   # reject uploads bigger than 8 MB

app = FastAPI(title="BananaVision")

# Allow the mobile app (a different origin) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

# --- load the model, the numeric config, and the content doc ONCE at startup ---
interpreter = Interpreter(model_path="banana_model.tflite")
interpreter.allocate_tensors()
IN = interpreter.get_input_details()[0]
OUT = interpreter.get_output_details()[0]

CONFIG = json.load(open("banana_config.json"))
CANON = CONFIG["canon_by_index"]
DAYS = CONFIG["days_by_stage"]
IMG_SIZE = tuple(CONFIG["img_size"])

GUIDE = load_stage_guide("banana_stages.md")   # {stage: {nutrients, benefits, ...}}

# --- banana gate: a stock ImageNet MobileNetV2 that answers "is this a banana at all?" ---
# The ripeness model only knows four stages, so it files *any* photo under one of them
# (a patterned wallpaper scores 99% "unripe"). This model rejects non-bananas first.
gate = Interpreter(model_path="imagenet_gate.tflite")
gate.allocate_tensors()
GATE_IN = gate.get_input_details()[0]
GATE_OUT = gate.get_output_details()[0]
BANANA_CLASS = 955      # "banana" in ImageNetLabels.txt (index 0 is "background")
# Accept when "banana" is among the gate's top 50 of 1001 guesses. Calibrated on
# data/banana_ripeness/valid (worst banana: rank 38) and confirmed on test/ (100% of
# all four stages pass); the closest non-banana tried ranked 106.
GATE_TOP_K = 50


def run_model(pil_image):
    """Preprocess a PIL image and run one forward pass; returns the prob vector."""
    img = pil_image.convert("RGB").resize(IMG_SIZE)
    batch = np.expand_dims(np.asarray(img, dtype=np.float32), 0)  # (1, 224, 224, 3)
    interpreter.set_tensor(IN["index"], batch)
    interpreter.invoke()
    return interpreter.get_tensor(OUT["index"])[0]


def banana_score(pil_image):
    """Probability the gate gives 'banana', and its rank among all 1001 classes (0 = top)."""
    height, width = GATE_IN["shape"][1:3]
    pixels = np.asarray(pil_image.convert("RGB").resize((width, height)))
    if GATE_IN["dtype"] == np.uint8:
        batch = pixels[None].astype(np.uint8)
    else:
        batch = pixels[None].astype(np.float32) / 127.5 - 1.0
    gate.set_tensor(GATE_IN["index"], batch)
    gate.invoke()
    raw = gate.get_tensor(GATE_OUT["index"])[0].astype(np.float32)
    scale, zero_point = GATE_OUT["quantization"]
    logits = (raw - zero_point) * scale if scale else raw   # this model outputs logits
    probs = np.exp(logits - logits.max())
    probs /= probs.sum()
    return float(probs[BANANA_CLASS]), int((logits > logits[BANANA_CLASS]).sum())


def analyze(pil_image):
    probs = run_model(pil_image)
    top = int(np.argmax(probs))
    stage = CANON[top]

    point = sum(float(p) * DAYS.get(s, 0.0) for p, s in zip(probs, CANON))
    considered = [DAYS.get(s, 0.0) for p, s in zip(probs, CANON) if p >= 0.10] or [point]

    return {
        "stage": stage,
        "confidence": round(float(probs[top]), 3),
        "edible": stage != "rotten",
        "days_remaining": {"estimate": round(point, 1),
                            "low": round(min(considered), 1),
                            "high": round(max(considered), 1)},
        "guide": GUIDE.get(stage, {}),   # six prose fields from banana_stages.md
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze_endpoint(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image too large (max 8 MB).")
    try:
        Image.open(io.BytesIO(data)).verify()          # is it a real image?
        image = Image.open(io.BytesIO(data))            # reopen (verify consumes it)
        image = ImageOps.exif_transpose(image)          # phone photos store rotation in EXIF
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="That is not a valid image.")

    score, rank = banana_score(image)
    if rank >= GATE_TOP_K:
        return {"recognized": False, "banana_score": round(score, 3)}
    return {"recognized": True, "banana_score": round(score, 3), **analyze(image)}
