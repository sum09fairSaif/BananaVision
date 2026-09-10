"""BananaVision online backend — serves the quantized .tflite with LiteRT,
and the per-stage content parsed from banana_stages.md.
Local run:  uvicorn app:app --host 0.0.0.0 --port 8000 --reload
On Hugging Face Spaces the Dockerfile runs it on port 7860.
"""
import io
import json
import numpy as np
from PIL import Image, UnidentifiedImageError
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


def run_model(pil_image):
    """Preprocess a PIL image and run one forward pass; returns the prob vector."""
    img = pil_image.convert("RGB").resize(IMG_SIZE)
    batch = np.expand_dims(np.asarray(img, dtype=np.float32), 0)  # (1, 224, 224, 3)
    interpreter.set_tensor(IN["index"], batch)
    interpreter.invoke()
    return interpreter.get_tensor(OUT["index"])[0]


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
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="That is not a valid image.")
    return analyze(image)
