# Mark each shot's subject in <seg>/faces.json from its keyframes with the anime face cascade:
# [x0, y0, x1, y1, eyes] as fractions of the frame (the largest face; the eye line at 48 % down the box).
# Also draws <seg>/faces_sheet.jpg (each shot's middle keyframe with its box) for checking.
import sys, os, json, cv2
seg, cascade = sys.argv[1], sys.argv[2]
det = cv2.CascadeClassifier(cascade)
d = json.load(open(os.path.join(seg, 'segregation.json')))
W, H = d['video']['width'], d['video']['height']
out, tiles = {}, []
for s in d['shots']:
    if s.get('kind') != 'picture':
        continue
    best = None
    kfs = s.get('keyframes') or []
    order = [kfs[len(kfs)//2]] + [k for i, k in enumerate(kfs) if i != len(kfs)//2] if kfs else []
    img_mid = None
    for k in order:
        p = os.path.join(seg, 'frames', f'f{k:07d}.jpg')
        if not os.path.exists(p):
            continue
        img = cv2.imread(p)
        if img_mid is None:
            img_mid = img
        h, w = img.shape[:2]
        g = cv2.equalizeHist(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
        fs = det.detectMultiScale(g, scaleFactor=1.08, minNeighbors=4, minSize=(max(16, h // 14), max(16, h // 14)))
        if len(fs):
            x, y, fw, fh = max(fs, key=lambda f: f[2] * f[3])
            # the cascade box is the inner face: widen it a little, down to the chin
            x0, x1 = (x - 0.12 * fw) / w, (x + 1.12 * fw) / w
            y0, y1 = (y - 0.05 * fh) / h, (y + 1.15 * fh) / h
            best = [round(max(0, x0), 3), round(max(0, y0), 3), round(min(1, x1), 3), round(min(1, y1), 3), round((y + 0.5 * fh) / h, 3)]
            break
    out[s['id']] = best
    if img_mid is not None:
        t = cv2.resize(img_mid, (256, int(256 * H / W)))
        if best:
            cv2.rectangle(t, (int(best[0]*256), int(best[1]*t.shape[0])), (int(best[2]*256), int(best[3]*t.shape[0])), (0, 255, 255), 2)
        cv2.putText(t, s['id'], (4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        tiles.append(t)
json.dump({'_': 'auto-marked with the anime face cascade (lbpcascade_animeface); null = no face found: give the cut its own face or x', 'aspect': W / H, 'shots': out}, open(os.path.join(seg, 'faces.auto.json'), 'w'), indent=1)
import numpy as np
cols = 8
if tiles:
    th, tw = tiles[0].shape[:2]
    rows = (len(tiles) + cols - 1) // cols
    sheet = np.zeros((rows * th, cols * tw, 3), np.uint8)
    for i, t in enumerate(tiles):
        sheet[(i // cols) * th:(i // cols) * th + th, (i % cols) * tw:(i % cols) * tw + tw] = t[:th, :tw]
    cv2.imwrite(os.path.join(seg, 'faces_sheet.jpg'), sheet, [cv2.IMWRITE_JPEG_QUALITY, 80])
print(seg, len(out), 'shots,', sum(1 for v in out.values() if v), 'with a face')
