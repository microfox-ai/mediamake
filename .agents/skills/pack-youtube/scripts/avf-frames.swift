// Frames of a video through AVFoundation, the decoder QuickTime and Finder use: a part it can't decode (an outro
// joined with other H.264 headers) fails here although ffmpeg plays it.
//   swift avf-frames.swift <video.mp4> <out prefix> <seconds before the end>...
import AVFoundation
import AppKit

let args = CommandLine.arguments
guard args.count >= 4 else {
  print("usage: swift avf-frames.swift <video.mp4> <out prefix> <seconds before the end>...")
  exit(2)
}
let asset = AVURLAsset(url: URL(fileURLWithPath: args[1]))
let duration = CMTimeGetSeconds(asset.duration)
let gen = AVAssetImageGenerator(asset: asset)
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
gen.maximumSize = CGSize(width: 640, height: 360)
print("duration \(duration) s")
var failed = false
for back in args[3...].compactMap(Double.init) {
  let t = max(0, duration - back)
  do {
    let img = try gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil)
    let file = "\(args[2])_\(String(format: "%.1f", t)).png"
    try NSBitmapImageRep(cgImage: img).representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: file))
    print(String(format: "%.2f", t), "decoded →", file)
  } catch {
    failed = true
    print(String(format: "%.2f", t), "FAILED:", error.localizedDescription)
  }
}
exit(failed ? 1 : 0)
