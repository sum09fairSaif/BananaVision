# Project Manual: Days to Banana Death 🍌
## A Computer-Vision Ripeness & Shelf-Life Mobile App — Build Guide

*A step-by-step build manual, structured like your ML labs: each Part has numbered Steps that tell you exactly what to type, where to type it, and — most importantly — **why**.*

### How to use this guide (read this first)

This is a **build guide**, not a finished project. It's laid out like your `LogisticRegressionFromScratch` lab: a brief that frames the problem, then Parts broken into Steps. Wherever you see **"Do the following: 1... 2..."**, that's telling you the actual lines to write and the reasoning behind each one. Open this file in VS Code and read it with the Markdown preview (`Cmd/Ctrl + Shift + V`) so the code blocks render cleanly.

The project has three kinds of code, and it helps to know which is which:

- **The model-building code (Parts 1–7)** is Python that builds and trains the classifier. These blocks **share state** — later ones reuse variables (`model`, `class_names`, …) defined earlier — so run them **in one session, in order**. In VS Code the cleanest way is the **Python Interactive window**: put each block in a `.py` file with a `# %%` line above it (the Jupyter extension turns that into a runnable cell you can execute with `Shift + Enter`), or open a `.ipynb` in VS Code if you prefer. If your laptop has no GPU (the graphics chip that makes training ~10–50× faster), run these Parts in **Google Colab** (*Runtime → Change runtime type → GPU*) and download the two output files (`banana_model.tflite`, `banana_config.json`); everything else runs fine locally.
- **The backend files (Part 8)** — `app.py`, `requirements.txt`, `Dockerfile` — are **real files you create in your project folder**, not things you run interactively. The guide shows each file's full contents; make the file, paste, save.
- **The app code (Part 9)** lives in a **separate Expo project** and is shown as reference blocks to paste into that project, not into this repo.

A suggested layout so the pieces don't collide:
```
bananavision/
    train/    # Parts 1-7: your training script/notebook + the dataset
    api/      # Part 8: app.py, requirements.txt, Dockerfile, banana_model.tflite,
              #         banana_config.json, banana_stages.md, banana_content.py
    app/      # Part 9: the Expo app
```

## Product Brief

Read through the scenario below. You are putting yourself in the shoes of the **solo founder and ML engineer** of a tiny product studio building a consumer app called **BananaVision**.

### Product and Context
People throw away an enormous amount of fruit because they can't tell how much life is left in it. A banana that looks "a bit spotty" might have three good days left or be one day from mush, and most people guess wrong in both directions — tossing edible fruit or letting good fruit rot. BananaVision is a phone app that answers, from a single photo, the one question a person actually has standing at their counter: *"Is this still good, and for how long?"*

### The Product Goal
From one picture of a banana, the app returns four things a user cares about:
1. **Ripeness stage** — where this banana is in its life (unripe → ripe → overripe → rotten).
2. **Shelf life** — an estimate of "days before expiration," expressed as a number and a range.
3. **Nutrition at this stage** — what the user *gains* from eating it now, and what they've *missed* (nutrients that were higher at an earlier stage).
4. **Edibility** — a plain yes/no on whether they should eat it at all.

### Your Role and Task
You are building this end to end. Your task breaks into three layers, and a big part of the job is knowing **which layer each question belongs to** (this is the single most important framing decision in the project — see Part 0):
1. **A machine-learning layer** that looks at pixels and predicts the ripeness *stage*. This is the only part that genuinely "sees."
2. **A logic layer** that turns that stage (and the model's confidence) into shelf life, nutrition, and edibility. This is ordinary Python and domain knowledge — no ML.
3. **A delivery layer** that puts all of it on a phone: an exported model, a small backend, and a camera screen.

# Part 0. Frame the Problem Honestly (the most important Part)

Before any code, be precise about **what you are actually predicting**, because the title of the project ("*days to expiration*") hides a trap that sinks a lot of student CV projects.

**What a single photo can tell you.** A photo carries *appearance*: colour, spot coverage, texture. Appearance maps well onto **ripeness stage** — a green banana and a black banana look different, and a model can learn that reliably. So stage is a well-posed learning problem: input (pixels) genuinely determines the output (stage).

**What a single photo *cannot* directly tell you.** "This banana will expire in 2.4 days" is **not** something a lone photo determines, because it depends on things not in the frame — room temperature, whether it's bagged, how it was handled. Two bananas that look identical today can expire days apart. If you tried to train a regressor (a model that outputs a continuous number) to predict raw days from one image, you'd be asking it to predict something the input doesn't contain, and it would learn noise.

**So how do we still deliver "days"?** We make **stage the backbone** (a well-posed classification problem the model can nail), then derive a *continuous* days estimate from the model's **probability vector**. Concretely, if the model says 70% "ripe" / 30% "overripe", and ripe bananas have ~3 days left while overripe ones have ~1, we return the probability-weighted average — a smooth number like `0.7×3 + 0.3×1 = 2.4` days. That is a legitimate **regression-flavoured output** built on an honest classifier, and it degrades gracefully: a confident "rotten" gives ~0 days, a confident "unripe" gives ~a week.

> **The honest caveat, stated up front:** those per-stage day values are *heuristics* (informed rules of thumb), not measurements. To make this a *true* learned regressor you would need **time-lapse data** — the same banana photographed every day until it rots, so each image carries a real "days remaining" label. Part 5 shows exactly where a learned regressor would slot in if you collect that data later. Building the heuristic version first is the right MVP (minimum viable product): it ships, it's useful, and it gives you the app skeleton to plug a better model into.

**MVP vs. stretch, so you don't over-build:**
- **MVP (this manual, online):** stage classifier → probability-weighted days → lookup tables for nutrition/edibility → all of it **served from a small online backend the phone calls over the internet**, so the app works on any phone anywhere and you can update the model without shipping an app update.
- **Stretch (later):** collect time-lapse photos and train a real days-remaining regression head; add variety/temperature inputs; and, as a separate v2 axis, an **offline on-device** version so it runs with no server and no internet.

# Part 1. Environment, Data, and a First Look

### Step A — Set up your environment

**Do the following:**
1. If on Colab, TensorFlow is preinstalled; you only need `scikit-learn` and `matplotlib`, which are also preinstalled. Locally, create a fresh environment and `pip install tensorflow scikit-learn matplotlib pillow`.
2. Run the imports block below. We import `tensorflow` (the deep-learning framework), its `keras` sub-API (the friendly high-level layer for building models), `MobileNetV2` (a small, fast image model we'll reuse — more on this in Part 3), `numpy` (array maths), `matplotlib` (plots), and `pathlib`/`json` (files).

**Why these and not others:** we deliberately build on **MobileNetV2** rather than a big model like ResNet-50 because the end goal is a *phone*. A model that's accurate but too heavy to run on a mid-range Android is a product failure, not just a slow model. Choosing the deployment-friendly backbone *now* saves a painful re-train later.

```python
import os
import json
import pathlib

import numpy as np
import matplotlib.pyplot as plt

import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

print("TensorFlow version:", tf.__version__)
print("GPU available:", bool(tf.config.list_physical_devices("GPU")))
```

### Step B — Get a dataset

You need images of bananas sorted into one folder per ripeness stage. Any of these work; the first is the largest and the easiest starting point:

- **Banana Ripeness Classification (≈13K images)** — `kaggle.com/datasets/shahriar26s/banana-ripeness-classification-dataset`. Big, banana-only, already split by stage. **Recommended.**
- **Fruit Ripeness: Unripe/Ripe/Rotten** — `kaggle.com/datasets/leftin/fruit-ripeness-unripe-ripe-and-rotten` (use the `banana` subfolders).
- **BananaImageBD** (Green/Semi-ripe/Ripe/Overripe) — published dataset, ~2.5K augmented images.

**Do the following:**
1. Download and unzip a dataset so that its structure is **one subfolder per class**, like this (folder names can differ — you'll map them in Part 5):
   ```
   data/banana_ripeness/
       unripe/    img001.jpg ...
       ripe/      img101.jpg ...
       overripe/  img201.jpg ...
       rotten/    img301.jpg ...
   ```
2. Set `DATA_DIR` in the next block to point at that top folder.

**Why folder-per-class matters:** the loader we use in Step C infers each image's label *from the name of the folder it sits in*. The directory structure **is** your labelling — no separate CSV needed. This is the standard "image folder" convention across Keras/PyTorch, so getting your data into this shape is a transferable habit.

```python
IMG_SIZE = (224, 224)   # MobileNetV2's native input size; every image gets resized to this
BATCH_SIZE = 32          # how many images the model looks at per training step

# --- POINT THIS AT YOUR DATASET ---
DATA_DIR = pathlib.Path("data/banana_ripeness")

assert DATA_DIR.exists(), (
    f"{DATA_DIR} not found. Download a dataset (see Step B) and set DATA_DIR to the "
    "folder that contains one subfolder per ripeness stage."
)
print("Class folders found:", sorted(p.name for p in DATA_DIR.iterdir() if p.is_dir()))
```

### Step C — Load the images as datasets

**Do the following:**
1. Create `train_ds` with `tf.keras.utils.image_dataset_from_directory`, passing `DATA_DIR`, `validation_split=0.2`, `subset="training"`, a fixed `seed=123`, `image_size=IMG_SIZE`, `batch_size=BATCH_SIZE`, and `label_mode="int"`.
2. Create `val_ds` the same way but with `subset="validation"` and the **same** `seed`.
3. Save `class_names = train_ds.class_names` before you transform the datasets (the attribute disappears after the pipeline steps in Part 2).

**Why each argument is there:**
- `validation_split=0.2` + `subset=...` carves off 20% of the images as a **validation set** — data the model never trains on, so its score there estimates real-world performance. Training accuracy alone is a vanity metric (a model can memorise the training set and look perfect while being useless on new photos).
- The **identical `seed`** on both calls is critical: it guarantees the same random shuffle, so no image lands in *both* the training and validation sets. A leaked image would inflate your validation score and lie to you.
- `image_size=IMG_SIZE` resizes every photo to 224×224 so they stack into uniform batches (the model needs a fixed input shape). `label_mode="int"` gives each image an integer label (0,1,2,3), which pairs with the `sparse_categorical_crossentropy` loss we choose in Part 3.

```python
train_ds = tf.keras.utils.image_dataset_from_directory(
    DATA_DIR,
    validation_split=0.2,
    subset="training",
    seed=123,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
)

val_ds = tf.keras.utils.image_dataset_from_directory(
    DATA_DIR,
    validation_split=0.2,
    subset="validation",
    seed=123,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    label_mode="int",
)

class_names = train_ds.class_names   # e.g. ['overripe', 'ripe', 'rotten', 'unripe'] (alphabetical!)
print("Classes (in label-index order):", class_names)
```

### Step D — Look at your data before you model it

Never train on data you haven't eyeballed. A five-minute look catches mislabelled folders, weird crops, or one class with almost no images — problems that are invisible once everything is a tensor (a multi-dimensional array of numbers).

**Do the following:**
1. Plot a 3×3 grid of images from one training batch with their labels, to confirm the pictures match their folder names.
2. Print how many images are in each class, to check for **class imbalance** (one stage having far more images than another).

**Why imbalance matters:** if 60% of your images are "ripe", a lazy model can score 60% by guessing "ripe" every time while being blind to the other stages. Knowing this now tells you whether you'll need to weight the classes or gather more images later.

```python
# 1) Sanity-check a batch of images against their labels
plt.figure(figsize=(9, 9))
for images, labels in train_ds.take(1):
    for i in range(9):
        plt.subplot(3, 3, i + 1)
        plt.imshow(images[i].numpy().astype("uint8"))   # cast float pixels back to 0-255 ints to display
        plt.title(class_names[int(labels[i])])
        plt.axis("off")
plt.tight_layout()
plt.show()

# 2) Check class balance (counts the files in each class folder)
print("Images per class:")
for c in class_names:
    n = len(list((DATA_DIR / c).glob("*")))
    print(f"  {c:10s}: {n}")
```

# Part 2. Preprocess and Augment

### Step A — Speed up the input pipeline

**Do the following:**
1. Set `AUTOTUNE = tf.data.AUTOTUNE`.
2. On `train_ds`, chain `.cache().shuffle(1000).prefetch(AUTOTUNE)`; on `val_ds`, chain `.cache().prefetch(AUTOTUNE)`.

**Why:** `cache()` keeps decoded images in memory so they aren't re-read from disk every epoch (one full pass over the data); `shuffle(1000)` reorders training images each epoch so the model doesn't learn the *order* of the data; `prefetch` lets the CPU prepare the next batch while the GPU works on the current one — like a kitchen plating the next dish while the current one cooks, instead of doing them strictly one after another. We **don't** shuffle validation data — there's no learning happening there, so order is irrelevant.

```python
AUTOTUNE = tf.data.AUTOTUNE
train_ds = train_ds.cache().shuffle(1000).prefetch(AUTOTUNE)
val_ds = val_ds.cache().prefetch(AUTOTUNE)
print("Input pipelines ready.")
```

### Step B — Build a data-augmentation layer

**Do the following:**
1. Create a small `Sequential` model called `data_augmentation` containing `RandomFlip("horizontal")`, `RandomRotation(0.1)`, `RandomZoom(0.1)`, and `RandomContrast(0.1)`.
2. Do **not** apply it yet — we'll wire it *inside* the model in Part 3 so it runs only during training.

**Why augment at all:** your dataset has, say, a few thousand bananas, but users will photograph bananas at every angle, distance, and lighting. Augmentation shows the model randomly flipped/rotated/zoomed/re-lit copies of each training image, so it learns *"banana-ness at this stage"* rather than memorising the exact pixels of image #417. It's the CV equivalent of studying a concept with the flashcards shuffled and re-worded each time, instead of memorising the position of the answer on the page. This is the cheapest, highest-leverage defence against **overfitting** (scoring great on training data, poorly on real photos).

**Why only during training:** augmentation is a training-time trick. At prediction time you want the model to judge the *actual* photo the user took, untouched — so in Part 3 we pass `training=False` on the inference path.

```python
data_augmentation = models.Sequential(
    [
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.1),
        layers.RandomZoom(0.1),
        layers.RandomContrast(0.1),
    ],
    name="data_augmentation",
)
print(data_augmentation.summary())
```

# Part 3. Build the Model (Transfer Learning)

**What transfer learning is, in one breath:** instead of teaching a network to see *from nothing*, we take **MobileNetV2** — a network already trained on ImageNet (1.2 million everyday images) that has *already* learned generic visual building blocks (edges, textures, curves, blobs) — freeze that knowledge, and bolt a tiny new decision-making head onto the end that we train to say "banana stage". The analogy that maps cleanly onto what you already know: it's the CV version of **fine-tuning a pretrained language model** — you don't re-learn grammar, you adapt an existing competent model to your narrow task with a fraction of the data and compute.

### Step A — Assemble the model

**Do the following** (build the network as a function so it's easy to rebuild):
1. Create the **base**: `MobileNetV2(input_shape=IMG_SIZE + (3,), include_top=False, weights="imagenet")`. Set `base.trainable = False`.
2. Define an `Input` of shape `IMG_SIZE + (3,)`.
3. Pass the input through `data_augmentation`, then through `preprocess_input` (MobileNetV2's required pixel scaling — it expects values in [-1, 1], and this function does that conversion).
4. Pass that through the frozen `base` with `training=False`.
5. Add `GlobalAveragePooling2D()` to collapse the base's grid of features into one feature vector per image.
6. Add `Dropout(0.2)` (regularisation — see below), then a `Dense(num_classes, activation="softmax")` output layer.

**Why each piece:**
- `include_top=False` chops off ImageNet's original 1000-way classifier — we don't want "is this a golden retriever", we want our stages — and replaces it with our own head.
- `base.trainable = False` **freezes** the pretrained weights so our early training doesn't destroy the good features the base already has. (We selectively un-freeze a little in Part 4.)
- `GlobalAveragePooling2D` turns the base's 7×7×1280 output into a flat 1280-length vector by averaging each channel — a compact summary that's far less prone to overfitting than flattening every pixel.
- `Dropout(0.2)` randomly ignores 20% of that vector's values each training step, forcing the network not to depend on any single feature — like a study group where a random fifth of members are out each session, so no one becomes a single point of failure.
- `softmax` turns the final scores into **probabilities that sum to 1** across the stages. That probability vector isn't just for picking the top class — Part 5 uses the *whole* vector to compute the continuous days estimate.

```python
def build_model(num_classes):
    '''
    Builds a MobileNetV2-based banana-stage classifier.
    - Inputs: num_classes (int) = number of ripeness stages
    - Returns: (model, base_model). We return the base separately so Part 4 can
      un-freeze part of it for fine-tuning.
    '''
    base_model = MobileNetV2(
        input_shape=IMG_SIZE + (3,),
        include_top=False,      # drop ImageNet's 1000-class head; we add our own
        weights="imagenet",     # start from pretrained visual features
    )
    base_model.trainable = False   # freeze the borrowed knowledge for now

    inputs = layers.Input(shape=IMG_SIZE + (3,))
    x = data_augmentation(inputs)          # random flips/rotations (training only)
    x = preprocess_input(x)                # scale pixels to [-1, 1] as MobileNetV2 expects
    x = base_model(x, training=False)      # frozen feature extractor
    x = layers.GlobalAveragePooling2D()(x) # 7x7x1280 grid -> 1280 vector
    x = layers.Dropout(0.2)(x)             # regularisation
    outputs = layers.Dense(num_classes, activation="softmax")(x)  # stage probabilities

    model = models.Model(inputs, outputs)
    return model, base_model


model, base_model = build_model(num_classes=len(class_names))
```

### Step B — Compile the model

**Do the following:**
1. Call `model.compile()` with `optimizer=tf.keras.optimizers.Adam(1e-3)`, `loss="sparse_categorical_crossentropy"`, and `metrics=["accuracy"]`.

**Why these choices:**
- **Adam** is the default-good optimiser (the algorithm that adjusts weights to reduce the loss); `1e-3` (0.001) is a standard starting **learning rate** — the step size it takes downhill. Big enough to learn quickly, small enough not to overshoot.
- **`sparse_categorical_crossentropy`** is the right loss for *multi-class* classification where labels are **integers** (0,1,2,3) rather than one-hot vectors. It's the multi-class generalisation of the log loss you implemented by hand in your logistic-regression lab — same idea (punish confident wrong predictions hard), extended from 2 classes to N. The **"sparse"** prefix just means "labels are integers", which matches the `label_mode="int"` we chose in Part 1.
- **accuracy** is the human-readable metric (fraction correct) we watch during training; the *loss* is what's actually optimised.

```python
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"],
)

model.summary()   # verify the output layer has one unit per stage, and shapes line up
```

# Part 4. Train, Fine-Tune, and Evaluate

### Step A — Train the new head

**Do the following:**
1. Build two callbacks (hooks that run each epoch): `EarlyStopping(monitor="val_loss", patience=4, restore_best_weights=True)` and `ModelCheckpoint("best_banana_model.keras", monitor="val_loss", save_best_only=True)`.
2. Call `model.fit(train_ds, validation_data=val_ds, epochs=20, callbacks=callbacks)` and save the returned object as `history`.

**Why the callbacks:**
- **EarlyStopping** halts training when the validation loss stops improving for 4 epochs and rolls the weights back to the best point. This stops you from training past the sweet spot into overfitting, and it means you can safely set `epochs` high and let it decide when to quit.
- **ModelCheckpoint** saves the best version to disk as it goes, so a crash or a bad final epoch can't lose your good model. `best_banana_model.keras` is the file your backend loads in Part 8.

```python
callbacks = [
    tf.keras.callbacks.EarlyStopping(
        monitor="val_loss", patience=4, restore_best_weights=True
    ),
    tf.keras.callbacks.ModelCheckpoint(
        "best_banana_model.keras", monitor="val_loss", save_best_only=True
    ),
]

history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=20,
    callbacks=callbacks,
)
```

### Step B — Fine-tune the top of the base (optional but recommended)

Once the new head is trained, you can squeeze out more accuracy by **un-freezing the last few layers of the base** and training everything together at a *tiny* learning rate.

**Do the following:**
1. Set `base_model.trainable = True`, then re-freeze all but the last ~30 layers with a loop.
2. **Re-compile** with a much smaller learning rate: `Adam(1e-5)`. (You must recompile after changing `trainable` flags.)
3. Call `model.fit(...)` again for ~10 epochs with the same callbacks.

**Why such a small learning rate:** the base already holds good features. Big update steps now would **wreck** them (this is called catastrophic forgetting). A 1e-5 rate nudges the top layers to specialise on banana textures — the difference between a yellow peel and a brown-spotted one — without bulldozing the general vision knowledge underneath. We only unfreeze the *top* layers because those encode the most task-specific, high-level features; the bottom layers (edges, colours) are universal and worth leaving alone.

```python
# Un-freeze only the last 30 layers of the base
base_model.trainable = True
for layer in base_model.layers[:-30]:
    layer.trainable = False

# Recompile REQUIRED after changing trainable flags; note the 100x smaller LR
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"],
)

history_ft = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=10,
    callbacks=callbacks,
)
```

### Step C — Read the learning curves

**Do the following:**
1. Plot training vs. validation **accuracy** and training vs. validation **loss** across epochs.

**How to read them (this is the diagnostic that matters):** you want both curves rising (accuracy) / falling (loss) together. If **training accuracy keeps climbing while validation accuracy plateaus or drops**, that gap is **overfitting** — the model is memorising the training set. Cures: more augmentation, more `Dropout`, more data, or stop earlier. If **both** are stuck low, that's **underfitting** — the model is too weak or hasn't trained long enough; unfreeze more layers or train longer.

```python
def plot_history(*histories):
    '''Concatenate one or more Keras History objects and plot accuracy & loss.'''
    acc, val_acc, loss, val_loss = [], [], [], []
    for h in histories:
        acc += h.history["accuracy"]
        val_acc += h.history["val_accuracy"]
        loss += h.history["loss"]
        val_loss += h.history["val_loss"]

    epochs = range(1, len(acc) + 1)
    plt.figure(figsize=(12, 4))

    plt.subplot(1, 2, 1)
    plt.plot(epochs, acc, label="train")
    plt.plot(epochs, val_acc, label="validation")
    plt.title("Accuracy"); plt.xlabel("epoch"); plt.legend()

    plt.subplot(1, 2, 2)
    plt.plot(epochs, loss, label="train")
    plt.plot(epochs, val_loss, label="validation")
    plt.title("Loss"); plt.xlabel("epoch"); plt.legend()
    plt.show()


# Pass both phases if you fine-tuned; otherwise just plot_history(history)
plot_history(history, history_ft)
```

### Step D — Confusion matrix and per-class report

Overall accuracy hides *which* mistakes the model makes. For this product, some mistakes are far worse than others: calling a **rotten** banana **ripe** could make someone eat spoiled fruit, while confusing **ripe** and **overripe** is harmless. A confusion matrix (a grid of "true stage vs. predicted stage") shows you exactly where the errors land.

**Do the following:**
1. Loop over `val_ds`, collect the true labels and the model's `argmax` (index of the highest-probability class) predictions.
2. Print a `classification_report` (precision/recall/F1 per class) and plot the `confusion_matrix`.

**What to look for:** any off-diagonal cell touching the **rotten** row/column is a safety-relevant error — weight your later data collection toward whichever confusion shows up there.

```python
from sklearn.metrics import confusion_matrix, classification_report

y_true, y_pred = [], []
for images, labels in val_ds:
    probs = model.predict(images, verbose=0)
    y_pred.extend(np.argmax(probs, axis=1))
    y_true.extend(labels.numpy())

print(classification_report(y_true, y_pred, target_names=class_names))

cm = confusion_matrix(y_true, y_pred)
plt.figure(figsize=(6, 5))
plt.imshow(cm, cmap="Blues")
plt.xticks(range(len(class_names)), class_names, rotation=45, ha="right")
plt.yticks(range(len(class_names)), class_names)
plt.xlabel("Predicted"); plt.ylabel("True"); plt.title("Confusion Matrix")
for i in range(len(class_names)):
    for j in range(len(class_names)):
        plt.text(j, i, cm[i, j], ha="center",
                 color="white" if cm[i, j] > cm.max() / 2 else "black")
plt.colorbar(); plt.tight_layout(); plt.show()
```

# Part 5. From Stage → Product Answers (the logic layer)

The model gives you a stage and a probability vector. Everything the *user* actually asked for — days left, edibility, and the nutrition/benefit/risk information — is built **on top** of that. Two of those are small numeric rules that live in code (days and edibility); the rich human-readable content lives in a separate **information document** (`banana_stages.md`) that a parser reads. No ML here, and that's the point: keep the learned part small and well-defined, and keep editable domain knowledge in a document you (or a nutritionist) can correct without touching code or retraining.

> **Detection vs. content — read this once.** The document does **not** detect the banana's stage. Detection is entirely the model's job (Parts 1–4): it looks at pixels and outputs `unripe / ripe / overripe / rotten`. The document is only consulted *afterward*, using that predicted stage as a lookup key to fetch what to show. Swapping JSON for a document changes the *content* layer, never the *detection* layer.

### Step A — Normalise messy folder names to canonical stages

Different datasets name their folders differently (`freshripe`, `green`, `Semi-ripe`...). Your day/nutrition tables shouldn't care. 

**Do the following:**
1. Define a canonical order `STAGE_ORDER = ["unripe", "ripe", "overripe", "rotten"]`.
2. Define a `STAGE_ALIASES` dict mapping the odd names your dataset uses onto those four.
3. Write `canonical_stage(name)` that lowercases the folder name and looks it up.

**Why:** this decouples your *data's* vocabulary from your *product's* vocabulary. Swap datasets later and you only edit the alias map — the rest of the logic, the app, and the exported config stay identical. These four canonical names are also the `## ` stage headings your content document uses, so the model's output lines up with the document's keys automatically.

```python
STAGE_ORDER = ["unripe", "ripe", "overripe", "rotten"]

STAGE_ALIASES = {
    "green": "unripe", "freshunripe": "unripe", "semiripe": "unripe", "semi-ripe": "unripe",
    "yellow": "ripe", "freshripe": "ripe", "fresh": "ripe",
    "spotted": "overripe", "brown": "overripe",
    "rotten": "rotten", "spoiled": "rotten", "black": "rotten",
}

def canonical_stage(name):
    '''Map a dataset folder name (any casing/spelling) to one of STAGE_ORDER.'''
    key = name.strip().lower().replace(" ", "").replace("_", "").replace("-", "")
    if key in STAGE_ORDER:
        return key
    return STAGE_ALIASES.get(key, key)  # falls back to the raw key if unmapped

# Map each model output index -> canonical stage, in the model's label order:
CANON_BY_INDEX = [canonical_stage(c) for c in class_names]
print("Model index -> canonical stage:", dict(enumerate(CANON_BY_INDEX)))
```

### Step B — Shelf life as a probability-weighted number

This is the "regression-flavoured" output promised in Part 0.

**Do the following:**
1. Define `DAYS_BY_STAGE` — the typical days-left at room temperature for each canonical stage.
2. Write `expected_days_remaining(probs)` that returns `Σ  P(stage_i) × DAYS_BY_STAGE[stage_i]` over the model's classes — a smooth, continuous estimate.
3. Also return a rough **range** (from the most and least optimistic stages carrying non-trivial probability) so the app can show "≈2 days (1–3)".

**Why weight by probability instead of just using the top class:** a banana the model is 51% sure is "ripe" and 49% "overripe" is genuinely on the edge; a hard bucket would jump discontinuously from 3 days to 1 as that 51% tips to 49%. The weighted average moves *smoothly* through 2 days, which both reflects reality and feels less jumpy to the user. **Remember these numbers are heuristics** (Part 0): edit `DAYS_BY_STAGE` freely, or replace this whole function with a learned regressor once you have time-lapse data — the app calls the function either way.

```python
DAYS_BY_STAGE = {
    "unripe":   7.0,   # firm & green: about a week before it's at its best-then-declining
    "ripe":     3.0,   # yellow, maybe light flecks: a few good days
    "overripe": 1.0,   # heavy spots/soft: roughly a day of eating window
    "rotten":   0.0,   # past it
}

def expected_days_remaining(probs):
    '''
    Continuous shelf-life estimate from the full probability vector.
    - Input: probs = 1-D array of class probabilities in the model's label order
    - Returns: (point_estimate_days, low_days, high_days)
    '''
    point = 0.0
    for p, stage in zip(probs, CANON_BY_INDEX):
        point += float(p) * DAYS_BY_STAGE.get(stage, 0.0)

    # crude range: consider stages the model gives >=10% probability
    considered = [DAYS_BY_STAGE.get(s, 0.0)
                  for p, s in zip(probs, CANON_BY_INDEX) if p >= 0.10]
    low = min(considered) if considered else point
    high = max(considered) if considered else point
    return round(point, 1), round(low, 1), round(high, 1)
```

### Step C — Edibility rule

**Do the following:**
1. Write `is_edible(stage)` returning `False` only for `"rotten"`, `True` otherwise.

**Why a rule — in code, not in the document:** edibility is a deterministic consequence of stage, so a plain rule is simpler, auditable, and can't produce a weird ML mistake on a safety-critical answer. We keep the yes/no in code for the same reason: the human-readable *explanation* of why lives in the document's risk text, but the verdict itself shouldn't depend on how someone worded a paragraph. (If you later care about mould specifically, that *would* be a new vision task — a separate classifier — not a tweak to this rule.)

```python
def is_edible(stage):
    '''Returns True unless the banana is rotten. Safety-relevant, so it stays a code rule.'''
    return stage != "rotten"
```

### Step D — Nutrition, benefits, and risks from the information document

Here's the design change that keeps this project maintainable: the per-stage content a user reads — essential nutrients, benefits, what's missing, potential risks, who it's encouraged for, and who should limit or avoid it — does **not** live in Python. It lives in an editable, cited document, `banana_stages.md`, and a small parser turns it into data.

**Do the following:**
1. Create `banana_stages.md` with one `## <stage>` heading per canonical stage and, under each, six `### ` sections: *Essential nutrients*, *Benefits at this stage*, *What's missing*, *Potential risks*, *Encouraged for*, and *Who should limit or avoid*. Write real, sourced prose under each heading. (A ready-made, fully-cited version of this file ships alongside this manual — start from it rather than writing it cold.)
2. Create `banana_content.py` — a ~40-line parser exposing `load_stage_guide(path)`, which returns `{ stage: {nutrients, benefits, missing, risks, encouraged_for, avoid_or_limit} }`. It finds each piece of text by its heading, so authors can rewrite the prose freely as long as the headings stay put; it also reads `.txt` and `.pdf`.
3. Load it once, and assert it's complete.

**Why a document instead of a Python dictionary:** the nutrition/benefit/risk copy is *domain knowledge*, not something the image model predicts — and it's exactly the kind of content a non-engineer (a nutritionist, or you in six months) will want to correct, cite, and expand without opening a `.py` file or retraining anything. A lightly-structured document gives you both: a human writes natural, referenced prose, and the parser still turns it into clean fields the app can render. The model stays a *detector*; the document is the editable *knowledge base* its output indexes into.

```python
from banana_content import load_stage_guide, missing_pieces

# Parse the cited document into per-stage content (the same shape the app serves)
GUIDE = load_stage_guide("banana_stages.md")

# Fail loudly if an edit dropped a stage or renamed a heading, rather than
# silently serving blank fields to users:
gaps = missing_pieces(GUIDE)
assert not gaps, f"banana_stages.md is missing content: {gaps}"

print("Loaded stages:", [s for s in GUIDE if s in STAGE_ORDER])
print("Sections per stage:", list(GUIDE["ripe"].keys()))
```

> **The whole design in one line: numbers in code, words in the document.** `DAYS_BY_STAGE` (Step B) and the edibility rule (Step C) stay in Python because the code uses them as *numbers and logic*; the nutrition/benefit/risk *text* lives in `banana_stages.md`. Nothing is duplicated between them, so nothing can drift out of sync.

# Part 6. The One Function the App Calls

Everything above now collapses into a single function — your **inference contract**: the one well-defined boundary between the ML world and the app world. The app hands it an image; it hands back a plain dictionary (which becomes JSON). Keeping this boundary narrow means you can change the model, edit the content document, even swap the whole training approach, and the app never has to change as long as this function's output shape stays the same.

### Step A — Preprocess an arbitrary user photo

**Do the following:**
1. Write `preprocess_image(image)` that accepts a file path **or** a PIL image, converts to RGB, resizes to `IMG_SIZE`, turns it into a float array, and adds a batch dimension (`np.expand_dims(..., 0)`), because the model always expects a *batch*, even of one.

**Why not call `preprocess_input` here:** we baked MobileNetV2's `preprocess_input` *inside* the model in Part 3. So this function only needs to produce a clean 224×224×3 batch; the model does the [-1,1] scaling itself. Doing it in exactly one place prevents the classic "trained one way, served another" bug.

```python
from PIL import Image

def preprocess_image(image):
    '''
    Accepts a file path (str) or a PIL.Image and returns a (1, 224, 224, 3) float batch.
    Does NOT scale pixels - the model's built-in preprocess_input handles that.
    '''
    if isinstance(image, str):
        image = Image.open(image)
    image = image.convert("RGB").resize(IMG_SIZE)
    arr = np.asarray(image, dtype="float32")
    return np.expand_dims(arr, axis=0)   # add batch dimension -> shape (1, 224, 224, 3)
```

### Step B — Assemble the full answer

**Do the following:**
1. Write `analyze_banana(image)` that: preprocesses the image, runs `model.predict`, takes the top class, maps it to a canonical stage, computes days via `expected_days_remaining`, edibility via `is_edible`, and pulls that stage's entry from `GUIDE` — then returns one tidy dict.

**Why return a dict/JSON and not print text:** the app needs *structured* data it can lay out into a nice result card (a number here, a coloured badge there, a section per topic), not a paragraph it has to parse. A clean JSON contract is what lets the same backend serve a phone app today and a web dashboard tomorrow. Note the `guide` field is simply whatever the document held for that stage — add a `### ` section to `banana_stages.md` and it flows through here and into the app with no code change.

```python
def analyze_banana(image):
    '''
    The single entry point the app calls.
    - Input: file path or PIL.Image of one banana
    - Returns: dict with stage, confidence, shelf life, edibility, and the
      per-stage guide (nutrients, benefits, missing, risks, encouraged_for,
      avoid_or_limit) read from banana_stages.md
    '''
    batch = preprocess_image(image)
    probs = model.predict(batch, verbose=0)[0]      # 1-D probability vector
    top_idx = int(np.argmax(probs))
    stage = CANON_BY_INDEX[top_idx]
    confidence = float(probs[top_idx])

    point, low, high = expected_days_remaining(probs)

    return {
        "stage": stage,
        "confidence": round(confidence, 3),
        "edible": is_edible(stage),
        "days_remaining": {"estimate": point, "low": low, "high": high},
        "guide": GUIDE.get(stage, {}),   # six prose fields from the document
        "all_probabilities": {CANON_BY_INDEX[i]: round(float(p), 3)
                              for i, p in enumerate(probs)},
    }
```

### Step C — Try it

**Do the following:**
1. Point `sample` at any banana image on disk and pretty-print the result. This is the exact payload your phone will receive.

```python
sample = "path/to/a/test_banana.jpg"   # <- set to a real image to try it
# print(json.dumps(analyze_banana(sample), indent=2))
print("Set `sample` to a real image path, then uncomment the line above to test.")
```

# Part 7. Export the Model (TFLite / LiteRT + slim config)

Export two things: the **model** in the small `.tflite` format, and a **small numeric config** the code needs. The nutrition/benefit/risk *content* is not exported at all — it already lives in `banana_stages.md`, which you ship as-is. Even though we're going online, we serve the *lightweight* `.tflite` on the server (Part 8) — not the heavy Keras model — so the backend stays small enough to run on a free host.

> **Naming note:** Google renamed "TensorFlow Lite" to **LiteRT**. It's the *same* `.tflite` file and the same converter you already have in TensorFlow; only the runtime package name changed (Part 8 uses it). You don't need to install anything new here.

### Step A — Convert the model to TFLite

**Do the following:**
1. Create a `TFLiteConverter` from your trained Keras model, set `optimizations = [tf.lite.Optimize.DEFAULT]`, convert, and write `banana_model.tflite`.

**Why convert and why "optimize":** the `.tflite` is a slimmed-down model built for fast, low-memory inference. `Optimize.DEFAULT` applies **dynamic-range quantization** (storing weights in 8-bit instead of 32-bit), which shrinks the file ~4× and speeds it up for a tiny accuracy dip — and, importantly, it keeps the model's **inputs and outputs as float32**, so your server code feeds it a normal float image and reads normal float probabilities (no integer-scaling gymnastics). Re-check accuracy after quantizing.

```python
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()

with open("banana_model.tflite", "wb") as f:
    f.write(tflite_model)
print("Wrote banana_model.tflite:", len(tflite_model) // 1024, "KB")
```

### Step B — Save the slim config (numbers only)

**Do the following:**
1. Dump only the model-tied *numbers* — `canon_by_index`, `days_by_stage`, and `img_size` — into `banana_config.json`.

**Why so little in the JSON now:** the config holds only what the code uses numerically and what's tied to *this* trained model — the label order the model outputs, the day estimates, and the input size the server must resize to. Everything a human reads — nutrition, benefits, risks, demographics — stays in `banana_stages.md`, which the backend parses directly. Two clean artifacts with no overlap: **numbers in `banana_config.json`, words in `banana_stages.md`.** Because nothing is duplicated, nothing can drift out of sync.

```python
config = {
    "canon_by_index": CANON_BY_INDEX,   # model output order -> canonical stage
    "days_by_stage": DAYS_BY_STAGE,     # for the probability-weighted days estimate
    "img_size": list(IMG_SIZE),         # so the server preprocesses exactly as training did
}
with open("banana_config.json", "w") as f:
    json.dump(config, f, indent=2)
print("Wrote banana_config.json")
```

> The two content files — `banana_stages.md` and `banana_content.py` — aren't generated here; they're hand-maintained and travel with your backend. Copy them into the `api/` folder in Part 8.

# Part 8. Serve It — the Online Backend API

This is the spine of the MVP. The model lives on a small web server on the internet; the phone sends a photo to a public URL and gets JSON back. The phone never has to be on the same Wi-Fi as you, and you can retrain and redeploy the model without touching the app.

**The one important architecture choice:** we serve the quantized **`.tflite`** using the lightweight **`ai-edge-litert`** runtime (the pip package for LiteRT, formerly `tflite-runtime`) — **not** full TensorFlow. Full TF is ~1 GB of dependencies and needs a lot of RAM to load, which is slow and often won't fit on a free host. `ai-edge-litert` is a small, numpy-only package that runs the same `.tflite` — so your server boots fast and fits comfortably in a free tier. Same predictions, a fraction of the footprint.

### Step A — Write the FastAPI server

`app.py` below is the entire server. It loads the `.tflite` once at startup and exposes one endpoint, `POST /analyze`, that accepts an uploaded image and returns the same dict shape as Part 6's `analyze_banana`.

**Do the following:**
1. Create the three server files below — `app.py`, `requirements.txt`, and `Dockerfile` — together in your `api/` folder.
2. Put four more files in that same folder: `banana_model.tflite` and `banana_config.json` (from Part 7), plus `banana_stages.md` and `banana_content.py` (the content document and its parser). Those are everything the server needs. (The heavy `.keras` file stays on your training machine.)

**Why the structure it has:**
- **Load the model once at module top, not per request.** Loading takes time; doing it on every request would make the app crawl. Load once at startup, reuse for every call.
- **CORS** (Cross-Origin Resource Sharing) is enabled so your app — calling from a different origin — is allowed to reach this server; without it the request is blocked.
- **Input validation** (size cap + "is this really an image?") is there because a *public* endpoint will receive junk, and a server that crashes on a bad upload is a broken product. Returning a clean error is part of the job.

**Create `app.py`:**

```python
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
```

### Step B — The two deployment files

A host needs to know **what to install** (`requirements.txt`) and **how to run you** (`Dockerfile`). Create both files next to `app.py`.

**Why pin `numpy<2`:** `ai-edge-litert` currently builds against NumPy 1.x, and NumPy 2 changed some internals that break older compiled packages. Pinning avoids a confusing install-time crash. **Why `uvicorn[standard]`:** the `[standard]` extra pulls in the production-grade HTTP bits you want on a real server.

**Create `requirements.txt`:**

```text
fastapi
uvicorn[standard]
python-multipart
pillow
ai-edge-litert
numpy<2
```

**Why the Dockerfile looks like this:** it starts from a slim Python image (small, fast to build), installs your requirements, copies your files in, and launches `uvicorn` on **port 7860** — the port Hugging Face Spaces expects a Docker app to listen on. `--host 0.0.0.0` makes it listen on the container's real network interface (not just `localhost`), which is what lets outside traffic reach it.

**Create `Dockerfile`:**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
```

### Step C — Test locally, then deploy online

**First, prove it works on your own machine (in a terminal, not your interactive session):**
1. `pip install -r requirements.txt`
2. `uvicorn app:app --host 0.0.0.0 --port 8000 --reload`
3. `curl -F "file=@test_banana.jpg" http://localhost:8000/analyze` — you should get the JSON back.

**Then put it online. Recommended host: Hugging Face Spaces (Docker) — free CPU tier, generous RAM, always-on, no credit card.** It's built for exactly this.

1. Create an account at `huggingface.co`, then **New Space** → **SDK: Docker** → **Hardware: CPU basic (free)** → Public.
2. Into that Space's repo, add these seven files: `app.py`, `requirements.txt`, `Dockerfile`, `banana_model.tflite`, `banana_config.json`, `banana_stages.md`, and `banana_content.py`. (Drag-and-drop in the web UI, or `git push`.)
3. The Space builds automatically. When its status shows **Running**, your public API is at:
   `https://<your-username>-<space-name>.hf.space`
4. Confirm it's alive: open `https://<...>.hf.space/health` (should say `{"status":"ok"}`), then
   `curl -F "file=@test_banana.jpg" https://<...>.hf.space/analyze`.

**Why this host and one caveat:** a full-TensorFlow server would strain a free tier, but our LiteRT server is tiny, so it fits with room to spare — and it stays awake, so there's no cold-start delay for your users. The caveat: a **public** Space means your code and endpoint are public. That's fine for an MVP; when you want to lock it down, add a simple API-key check in `app.py` (read a key from an environment variable, compare it to a header) and store the key as a Space **secret**.

> **Free alternative:** Render's free tier also works *because* we went lightweight (a full-TF server won't fit its 512 MB, but the LiteRT one does). The trade-off is that Render's free service sleeps after ~15 minutes idle, so the first request after a nap is slow. Hugging Face Spaces avoids that.

# Part 9. The Mobile App (Expo / React Native)

> **▶ IN YOUR APP PROJECT (not this guide).** Everything in Part 9 lives in a **separate Expo project**. Mobile APIs move fast, so treat exact function names as "check the current `expo-camera` docs" and the *shape* of the code as the durable part.

**Why Expo:** Expo is the fastest way for someone comfortable with React/JavaScript to ship a real iOS/Android app — it handles the native build plumbing so you write mostly JS. Create the project with `npx create-expo-app bananavision` and add the camera with `npx expo install expo-camera`.

Because the brains live in your online backend, the app's whole job is: **take a photo → POST it to your URL → render the JSON**. That's it. The app carries no model and no logic tables, which keeps it tiny and means a model update never requires an app update.

**Do the following:**
1. Point `API` at the public URL from Part 8 (the `https://<...>.hf.space/analyze` one — **https**, since app stores require secure connections).
2. Use `expo-camera`'s `CameraView` to capture a still with `takePictureAsync`.
3. Send the photo as multipart form-data with `fetch`, and render the returned JSON — including **loading** and **error** states, and a gentle "not sure" message when confidence is low.

**Why the loading/error/low-confidence states matter:** a network call takes a moment and can fail (bad signal, server asleep), so a frozen screen reads as a broken app — show a spinner and catch errors. And when the model's top probability is low, saying *"I'm not sure — try a clearer, closer photo"* instead of a confident wrong guess is what makes users trust it. **Multipart form-data** is used because it's the standard way to POST a file over HTTP and exactly what your FastAPI `UploadFile` endpoint expects.

```jsx
// ▶ App.js  (Expo / React Native)  — calls your online backend
import { useState, useRef } from "react";
import { View, Text, Button, ActivityIndicator, ScrollView } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

const API = "https://your-username-bananavision.hf.space/analyze";  // <- your Space URL

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cameraRef = useRef(null);

  if (!permission?.granted) {
    return <Button title="Grant camera access" onPress={requestPermission} />;
  }

  async function snapAndAnalyze() {
    setLoading(true); setError(null); setResult(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      const form = new FormData();
      form.append("file", { uri: photo.uri, name: "banana.jpg", type: "image/jpeg" });
      const res = await fetch(API, { method: "POST", body: form });
      if (!res.ok) throw new Error("Server error");
      setResult(await res.json());          // the JSON contract from Part 6/8
    } catch (e) {
      setError("Couldn't analyze that — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const unsure = result && result.confidence < 0.5;

  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
      <Button title="Analyze banana" onPress={snapAndAnalyze} disabled={loading} />
      {loading && <ActivityIndicator size="large" />}
      {error && <Text style={{ padding: 16, color: "red" }}>{error}</Text>}

      {result && unsure && (
        <Text style={{ padding: 16 }}>
          I'm not sure about this one — try a clearer, closer photo in good light.
        </Text>
      )}

      {result && !unsure && (
        <ScrollView style={{ padding: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: "600" }}>Stage: {result.stage}</Text>
          <Text>~{result.days_remaining.estimate} days left
                ({result.days_remaining.low}-{result.days_remaining.high})</Text>
          <Text style={{ marginBottom: 4 }}>
            {result.edible ? "✅ Edible" : "❌ Do not eat"}
          </Text>

          {/* Each section is one prose field the backend read from banana_stages.md */}
          <Section title="Essential nutrients"       body={result.guide.nutrients} />
          <Section title="Benefits at this stage"    body={result.guide.benefits} />
          <Section title="What's missing"            body={result.guide.missing} />
          <Section title="Potential risks"           body={result.guide.risks} />
          <Section title="Encouraged for"            body={result.guide.encouraged_for} />
          <Section title="Who should limit or avoid" body={result.guide.avoid_or_limit} />

          <Text style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
            General guidance, not medical or food-safety advice.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

// Renders one titled block of the guide. Returns nothing if that field is empty,
// so adding or removing a section in banana_stages.md needs no change here.
function Section({ title, body }) {
  if (!body) return null;
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ fontWeight: "600" }}>{title}</Text>
      <Text>{body}</Text>
    </View>
  );
}
```

**Optional — a Sources screen.** Because every claim in `banana_stages.md` is cited and the document ends with a numbered reference list, you can add a small "Sources" screen. You don't need new data structures for it: either surface the `[n]` markers already embedded in the guide text, or have the backend expose the document's `## Sources and references` block on a `/sources` endpoint the screen fetches. Showing citations is what turns "an app said so" into "here's where this comes from."

**Later, if you ever want an offline version (v2):** you'd bundle the same `banana_model.tflite` inside the app and run it on-device with `react-native-fast-tflite`, reading the same `banana_config.json` and `banana_stages.md` so answers match the server exactly. That removes the network dependency but means model updates ship as app updates — which is why it's a v2, not part of this online MVP. The numbers-in-config, words-in-document split from Parts 5 and 7 is what makes that future switch painless.

# Part 10. Ship, Test, Iterate (MVP → v1)

The single biggest gap between "works in training" and "works in someone's kitchen" is **domain shift**: your training images are probably clean bananas on white backgrounds, while real users shoot bananas on cluttered counters, in bad light, still in the bunch. A model that scores 99% on the clean validation set can stumble badly on the first real photo — not because it's broken, but because it's never seen that distribution.

The fix is a loop, not a one-off: ship the MVP, let it (and you) take **real** photos in real kitchens, add those photos — correctly labelled — back into the training set, and retrain. A few hundred genuine in-the-wild images usually help more than thousands more clean studio ones, because they teach the model the messiness it will actually face. Bias your collection toward the confusions your Part 4 confusion matrix flagged, especially anything touching the *rotten* class, since that's the safety-relevant error.

Two guardrails worth adding early. First, a **confidence threshold**: if the top probability is low (say under 0.5), have the app say "I'm not sure — try a clearer, closer photo" rather than confidently guessing. A model that knows when it doesn't know earns far more trust than one that's occasionally, confidently wrong. Second, a visible **"general guidance, not medical or food-safety advice"** line near the edibility verdict — you're nudging good decisions, not certifying that fruit is safe, and the copy should say so.

One more habit, now that your content lives in a document: **validate it on every change.** A renamed heading or a dropped section in `banana_stages.md` would otherwise surface as a blank field in the app rather than an error. Run `missing_pieces()` from `banana_content.py` as a check — the `assert` in Part 5 Step D does exactly this — in CI, or just before you redeploy the Space, so a bad edit fails loudly instead of shipping empty sections. The payoff of the document design is real: a nutritionist, or you six months from now, can correct or expand the nutrition, risk, and demographic copy and redeploy **without retraining the model or touching Python** — this one validation step is the small price that keeps that freedom safe.

From there the roadmap writes itself: the moment you start collecting your own photos, snap the *same* banana daily as it ripens — that time-lapse is exactly the labelled "days remaining" data that turns Part 5's heuristic into a genuinely learned regressor, closing the honest gap you named back in Part 0.

# Part 11. Analysis

Answer these in your own words — a `NOTES.md` in your repo is a good home for them. They're the questions a reviewer (or a future you) should be able to answer about this project.

1. **What does the vision model actually predict, and what does it *not*?** Explain why ripeness *stage* is a well-posed learning problem from a single image, while raw "days to expiration" is not.
2. **Trace the days-remaining number.** Walk through how a probability vector like `{unripe: 0.05, ripe: 0.70, overripe: 0.25}` becomes a single continuous days estimate, and explain why the probability-weighted version behaves better at the boundary between two stages than a hard bucket would.
3. **Where will real-world accuracy break, and why?** Name the specific failure mode (from Part 10) and describe the data you'd collect to fix it.
4. **What would it take to replace the heuristic shelf-life with a *real* learned regressor?** Describe the dataset you'd need and where in Part 5 it would slot in.

*Your notes:*

1. 

2. 

3. 

4.

# Part 12. Reflection: AI Usage

1. Did you use AI tools while building this? If yes, which ones and at what points (framing the problem, writing the model, debugging the TFLite export, the React Native code)? If no, explain your reasoning.
2. If you used AI, describe one specific prompt that was genuinely useful and explain *why* it worked. If you didn't, walk through one part you had to figure out yourself and how you got there.
3. How did you verify the ML parts were correct — not just "the code ran", but that the model and the shelf-life logic actually do the right thing? What did you check, and what would catch a subtle mistake (whether from AI or your own reasoning)?
4. What is one thing you'd do differently next time, in how you approached the build or how you used (or didn't use) AI?

*Your notes:*
