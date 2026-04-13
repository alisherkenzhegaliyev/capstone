import torch
ck = torch.load("models/chexnet.pth.tar", map_location="cpu")
sd = ck.get("state_dict", ck)
keys = list(sd.keys())
print("First 5 keys:", keys[:5])
print("Classifier keys:", [k for k in keys if "classifier" in k])
