import platform
import psutil
import numpy as np

def print_hardware_info():
    print("=" * 60)
    print("HARDWARE & MEMORY TELEMETRY")
    print("=" * 60)
    try:
        with open("/proc/cpuinfo", "r") as f:
            for line in f:
                if "model name" in line:
                    print(f"CPU Model : {line.split(':')[1].strip()}")
                    break
    except Exception:
        pass
    print(f"Python    : {platform.python_version()}")
    print("=" * 60 + "\n")

def run_sorting_divergence_experiment():
    print("Running Architecture-Sensitive Sorting Divergence Experiment...")
    
    np.random.seed(999)
    
    size = 3000
    a = np.random.randn(size, size).astype(np.float32)
    
    x = np.dot(a, a.T)
    
    x = np.sin(x) * np.cos(x * 0.1)
    
    flat_x = x.ravel()
    indices = np.argsort(flat_x)
    
    sorted_x = flat_x[indices]
    
    result_sum = np.sum(sorted_x)
    
    print(f"Sorted-Sum Result (Sum)   : {result_sum}")
    print(f"Sorted-Sum Hex View       : {result_sum.tobytes().hex()}")
    print("=" * 60)

if __name__ == "__main__":
    print_hardware_info()
    run_sorting_divergence_experiment()