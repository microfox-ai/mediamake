# Build a 16:9 30 fps "art" video from picked images: each image 4 s, contained over a blurred,
# darkened cover of itself, with a slow push-in. Hard cuts between images (segregate finds them).
# Optional 5th argument WxH (default 2560x1440): 3414x1920 keeps a portrait pin's 9:16 crop at full
# 1080x1920 with no second upscale (pins are mostly portrait, made for phones).
import sys, os, subprocess, json
listfile, srcdir, out = sys.argv[1], sys.argv[2], sys.argv[3]
names = [l.split('\t')[1].strip() for l in open(listfile)]
picks = [int(x) for x in sys.argv[4].split(',')]
W, H = (int(v) for v in (sys.argv[5] if len(sys.argv) > 5 else '2560x1440').split('x'))
tmp = out + '.parts'; os.makedirs(tmp, exist_ok=True)
parts = []
for k, i in enumerate(picks):
    img = os.path.join(srcdir, names[i]); part = os.path.join(tmp, f'{k:03d}.mp4')
    fc = ("[0]split[a][b];"
          f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=30:2,eq=brightness=-0.18:saturation=1.1[bg];"
          f"[b]scale={W}:{H}:force_original_aspect_ratio=decrease:flags=lanczos[fg];"
          "[bg][fg]overlay=(W-w)/2:(H-h)/2,"
          f"scale=w='trunc({W}*(1+0.05*t/4)/2)*2':h=-2:eval=frame:flags=bicubic,crop={W}:{H},format=yuv420p")
    subprocess.run(['ffmpeg','-v','error','-y','-loop','1','-framerate','30','-t','4','-i',img,'-filter_complex',fc,'-r','30','-c:v','libx264','-preset','veryfast','-crf','14',part], check=True)
    parts.append(part)
with open(os.path.join(tmp,'list.txt'),'w') as fh:
    for p in parts: fh.write(f"file '{os.path.abspath(p)}'\n")
subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',os.path.join(tmp,'list.txt'),'-c','copy',out], check=True)
json.dump({'images': [names[i] for i in picks], 'seconds_each': 4}, open(out + '.json', 'w'), indent=1)
print(out, len(parts), 'images')
