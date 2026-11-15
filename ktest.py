import time, soundfile as sf, numpy as np
from kokoro_onnx import Kokoro
from misaki import zh
k = Kokoro("models/kokoro-v1.1-zh.onnx", "models/voices-v1.1-zh.bin", vocab_config="models/config-zh.json")
g2p = zh.ZHG2P(version="1.1")
print([v for v in k.get_voices()][:10], len(k.get_voices()))
txt = "小朋友们好，今天我们来认识直角、锐角和钝角。正好九十度的角叫直角。"
ph, _ = g2p(txt); print(ph)
for v in ["zf_001","zf_003"]:
    t=time.time(); s, sr = k.create(ph, voice=v, speed=1.0, is_phonemes=True); el=time.time()-t
    print(v, el, len(s)/sr, np.abs(s).max()); sf.write(f"/tmp/k_{v}.wav", s, sr)
