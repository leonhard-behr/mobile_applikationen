import numpy as np
import matplotlib.pyplot as plt

S_anchor = 35.0
S_max = 100.0

S_raw = np.linspace(0, S_max, 500)

S_scaled = np.where(
    S_raw >= S_anchor,
    20 + np.sqrt((S_raw - S_anchor) / (S_max - S_anchor)) * 79,
    (S_raw / S_anchor) * 20
)

plt.plot(S_raw, S_scaled)
plt.axvline(S_anchor, color="gray", linestyle="--", label="anchor")
plt.xlabel("S_raw")
plt.ylabel("S_scaled")
plt.title("Scaled similarity (piecewise)")
plt.legend()
plt.grid(True, alpha=0.3)
plt.show()