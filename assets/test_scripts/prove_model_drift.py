import hashlib
import json
import os
import platform
import subprocess
import torch
import torch.nn as nn

def get_cpu_info():
    info = {}
    try:
        with open("/proc/cpuinfo") as f:
            for line in f:
                if line.startswith("model name"):
                    info["cpu_name"] = line.split(":", 1)[1].strip()
                    break
    except OSError:
        info["cpu_name"] = platform.processor() or "Unknown"

    if platform.system() == "Windows":
        try:
            info["cpu_name"] = subprocess.check_output(
                ["wmic", "cpu", "get", "Name"],
                text=True, stderr=subprocess.DEVNULL
            ).splitlines()[1].strip()
        except Exception:
            pass
    return info

SEED = 42
torch.manual_seed(SEED)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


g = torch.Generator().manual_seed(123)
X = torch.randn(2048, 10, generator=g)
y = (X[:, 0] + 0.5 * X[:, 1] - X[:, 2] > 0).float().unsqueeze(1)
X, y = X.to(device), y.to(device)


model = nn.Sequential(
    nn.Linear(10, 32), nn.ReLU(),
    nn.Linear(32, 16), nn.ReLU(),
    nn.Linear(16, 1), nn.Sigmoid()
).to(device)

optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
loss_fn = nn.BCELoss()

# Training
model.train()
for epoch in range(5):
    optimizer.zero_grad()
    loss = loss_fn(model(X), y)
    loss.backward()
    optimizer.step()

h = hashlib.sha256()
for name, tensor in sorted(model.state_dict().items()):
    t = tensor.detach().cpu().contiguous()
    h.update(name.encode())
    h.update(str(t.shape).encode())
    h.update(t.numpy().tobytes())


environment = {
    "seed": SEED,
    "device": str(device),
    "pytorch": torch.__version__,
    "python": platform.python_version(),
    "os": platform.platform(),
    "cpu": get_cpu_info(),
    "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
    "cuda_version": torch.version.cuda,
    "cpu_threads_used_by_torch": torch.get_num_threads(),
    "final_loss": round(loss.item(), 8),
    "weights_sha256": h.hexdigest()
}

print(json.dumps(environment, indent=2))