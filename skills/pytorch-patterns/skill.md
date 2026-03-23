---
name: pytorch-patterns
description: "PyTorch/TFLite ML training pipeline patterns for edge NPU deployment"
---

# PyTorch / TFLite Patterns

## Dataset & DataLoader
```python
class DentalDataset(Dataset):
    def __init__(self, root_dir, transform=None):
        self.samples = sorted(glob(f"{root_dir}/**/*.png"))
        self.transform = transform

    def __getitem__(self, idx):
        image = Image.open(self.samples[idx]).convert("L")
        label = self.labels[idx]  # e.g., 0=normal, 1=metal, 2=edentulous, 3=bleeding
        if self.transform:
            image = self.transform(image)
        return image, label
```
- Use `num_workers=4`, `pin_memory=True` for GPU training
- Split: 70% train, 15% val, 15% test (stratified)

## Training Loop
- Standard train/val/test split with early stopping
- LR scheduling: `CosineAnnealingLR` or `OneCycleLR`
- Save best model by validation metric, not training loss
- Log metrics to CSV/JSON (no heavy framework dependency)

## Model Export Chain
```
PyTorch (.pt) → ONNX (.onnx) → TFLite (.tflite)
```
- Export with `torch.onnx.export(model, dummy_input, opset_version=13)`
- Convert ONNX → TFLite with `tf.lite.TFLiteConverter`
- INT8 post-training quantization for NPU target

## INT8 Quantization
```python
converter = tf.lite.TFLiteConverter.from_saved_model(model_path)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.representative_dataset = representative_dataset_gen
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
converter.inference_input_type = tf.int8
converter.inference_output_type = tf.int8
```

## NPU Deployment Constraints
- Avoid: Transformer attention, LayerNorm, GELU (CPU fallback on VIP8000)
- Prefer: standard Conv2D, DepthwiseSeparableConv, ReLU/ReLU6, GlobalAvgPool
- Input: grayscale, 128x128 or 256x256
- Use VX Delegate graph cache to skip initial compilation

## Experiment Tracking (Lightweight)
```python
results = {"epoch": e, "train_loss": tl, "val_loss": vl, "val_iou": viou}
with open("experiments.jsonl", "a") as f:
    f.write(json.dumps(results) + "\n")
```
