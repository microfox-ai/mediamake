# /// script
# dependencies = ["pillow"]
# ///
"""
Checks a store-listing folder against the App Store's and Google Play's rules, file by file.

    uv run scripts/check-assets.py <store-listing folder> [--tablet]

Layout it expects (what pack-store-listing makes; missing optional items are only noted):
    ios/iphone-6.3/*.png (required)   ios/iphone-6.9/*.png   ios/iphone-6.5/*.png   ios/ipad-13/*.png
    ios/app-icon-1024.png   ios/app-preview*.mp4
    android/play-icon-512.png   android/feature-graphic.(png|jpg)   android/phone/*.png
    android/tablet-7/*.png  android/tablet-10/*.png   android/promo-video*.mp4
Prints one line per file (ok / FAIL with the reason) and exits 1 if anything required fails.
The rules are in ../specs.md; keep both in step.
"""
import glob, json, os, subprocess, sys
from PIL import Image

root = sys.argv[1] if len(sys.argv) > 1 else '.'
tablet = '--tablet' in sys.argv
fails = 0

def say(ok, path, msg):
    global fails
    if not ok: fails += 1
    print(f"{'ok  ' if ok else 'FAIL'} {os.path.relpath(path, root)}: {msg}")

def note(msg): print(f"note {msg}")

def opaque(im):
    if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
        lo, _ = im.convert('RGBA').getchannel('A').getextrema()
        return lo == 255
    return True

def has_alpha_channel(im): return im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)

def shots(folder, sizes, lo, hi, label, required):
    files = sorted(glob.glob(os.path.join(root, folder, '*.png')) + glob.glob(os.path.join(root, folder, '*.jp*g')))
    if not files:
        if required: say(False, os.path.join(root, folder), f'{label}: none (need {lo} to {hi})')
        else: note(f'{folder}: none ({label}, optional)')
        return
    if not (lo <= len(files) <= hi): say(False, os.path.join(root, folder), f'{len(files)} screenshots, need {lo} to {hi}')
    for f in files:
        im = Image.open(f)
        size_ok = sizes(im.size) if callable(sizes) else im.size in sizes
        say(size_ok and opaque(im) and im.mode != 'P', f, f"{im.size[0]}x{im.size[1]} {im.mode}"
            + ('' if size_ok else f' (want {label})') + ('' if opaque(im) else ' has transparency'))

def video(pattern, check, label, required):
    files = glob.glob(os.path.join(root, pattern))
    if not files:
        if required: say(False, os.path.join(root, pattern), 'missing')
        else: note(f'{pattern}: none ({label}, optional)')
        return
    for f in files:
        info = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', f], capture_output=True, text=True).stdout)
        v = next((s for s in info['streams'] if s['codec_type'] == 'video'), {})
        a = next((s for s in info['streams'] if s['codec_type'] == 'audio'), None)
        dur = float(info['format']['duration'])
        num, den = (v.get('avg_frame_rate') or '0/1').split('/')
        fps = float(num) / float(den or 1)
        size = os.path.getsize(f) / 1e6
        problems = check(v, a, dur, fps, size)
        say(not problems, f, f"{v.get('width')}x{v.get('height')} {v.get('codec_name')} {fps:.0f} fps {dur:.1f} s "
            f"audio={a['codec_name'] + ' ' + str(a.get('channels')) + 'ch' if a else 'none'} {size:.1f} MB" + (f" ({'; '.join(problems)})" if problems else ''))

# ---------------- Apple ----------------
# App Store Connect's iPhone slot ("medium display") takes 6.1"/6.3" sizes only and uses them for every iPhone.
shots('ios/iphone-6.3', [(1206, 2622), (1179, 2556), (2622, 1206), (2556, 1179)], 1, 10, '6.3" 1206x2622 or 1179x2556', True)
shots('ios/iphone-6.9', [(1320, 2868), (1290, 2796), (1260, 2736), (2868, 1320), (2796, 1290), (2736, 1260)], 1, 10, '6.9" 1320x2868, 1290x2796 or 1260x2736', False)
shots('ios/iphone-6.5', [(1284, 2778), (1242, 2688), (2778, 1284), (2688, 1242)], 1, 10, '6.5" 1284x2778 or 1242x2688', False)
shots('ios/ipad-13', [(2064, 2752), (2048, 2732), (2752, 2064), (2732, 2048)], 1, 10, '13" iPad 2064x2752 or 2048x2732', tablet)
icon = os.path.join(root, 'ios/app-icon-1024.png')
if os.path.exists(icon):
    im = Image.open(icon)
    say(im.size == (1024, 1024) and not has_alpha_channel(im), icon, f"{im.size} {im.mode}" + (' (Apple refuses an icon with an alpha channel)' if has_alpha_channel(im) else ''))
else: note('ios/app-icon-1024.png: none (the build carries the icon)')

def apple_preview(v, a, dur, fps, size):
    p = []
    if (v.get('width'), v.get('height')) not in [(886, 1920), (1920, 886)]: p.append('6.9"/6.5" previews are 886x1920 or 1920x886')
    if not 15 <= dur <= 30: p.append('15 to 30 s')
    if fps > 30.01: p.append('at most 30 fps')
    if v.get('codec_name') not in ('h264', 'prores'): p.append('H.264 or ProRes 422 HQ')
    if not a: p.append('needs an audio track (silent is fine)')
    elif a.get('codec_name') != 'aac' or a.get('channels') != 2: p.append('audio: stereo AAC')
    if size > 500: p.append('500 MB at most')
    if size > 10: note("the App Store preview is over 10 MB, so Claude in Chrome can't upload it: re-encode a smaller copy (consoles.md)")
    return p
video('ios/app-preview*.mp4', apple_preview, 'App Store preview', False)

# ---------------- Google Play ----------------
pi = os.path.join(root, 'android/play-icon-512.png')
if os.path.exists(pi):
    im = Image.open(pi)
    kb = os.path.getsize(pi) / 1024
    say(im.size == (512, 512) and im.mode == 'RGBA' and kb <= 1024, pi, f"{im.size} {im.mode} {kb:.0f} KB" + ('' if im.mode == 'RGBA' else ' (32-bit PNG with alpha)'))
else: say(False, pi, 'missing (512x512 32-bit PNG)')
fg = (glob.glob(os.path.join(root, 'android/feature-graphic.png')) + glob.glob(os.path.join(root, 'android/feature-graphic.jp*g')))
if fg:
    im = Image.open(fg[0])
    say(im.size == (1024, 500) and not has_alpha_channel(im), fg[0], f"{im.size} {im.mode}" + (' (no alpha: JPEG or 24-bit PNG)' if has_alpha_channel(im) else ''))
else: say(False, os.path.join(root, 'android/feature-graphic.png'), 'missing (1024x500, JPEG or 24-bit PNG)')

def play_phone(size):
    w, h = size; s, l = min(w, h), max(w, h)
    return 320 <= s and l <= 3840 and l <= 2 * s
shots('android/phone', play_phone, 2, 8, 'each side 320 to 3840 px, long side at most twice the short (1080x1920 to be featured)', True)
phones = sorted(glob.glob(os.path.join(root, 'android/phone/*.png')))
if phones and not (len(phones) >= 4 and all(min(Image.open(f).size) >= 1080 for f in phones)):
    note('android/phone: to be featured, Play wants 4 or more at 1080 px or more on the short side')
def play_tablet(size):
    w, h = size; s, l = min(w, h), max(w, h)
    return 1080 <= s and l <= 7680 and l <= 2 * s
shots('android/tablet-7', play_tablet, 1, 8, '7" tablet, sides 320 to 3840', tablet)
shots('android/tablet-10', play_tablet, 1, 8, '10" tablet, sides 1080 to 7680', tablet)

def play_promo(v, a, dur, fps, size):
    p = []
    if (v.get('width') or 0) < 1280: p.append('at least 720p for YouTube')
    return p
video('android/promo-video*.mp4', play_promo, 'Play promo (goes up to YouTube; Play takes the link)', False)

print(f"\n{'all required assets pass' if not fails else str(fails) + ' problem(s)'}")
sys.exit(1 if fails else 0)
