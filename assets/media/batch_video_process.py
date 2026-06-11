"""
批量视频处理脚本
功能：亮度调整，以底边中心点为锚向四周扩散裁剪到原视频指定比例
      旋转（顺时针 0/90/180/270° 或任意角度），播放速度调整
      旋转后自动裁剪回旋转前的宽高比（最大内接矩形，无黑边）
      支持递归处理子目录，输出保留原始子目录结构
依赖：系统需安装 ffmpeg（https://ffmpeg.org/download.html）

用法：
    python batch_video_process.py [输入目录] [输出目录]
"""

import sys
import subprocess
import json
import math
from pathlib import Path

# ─────────────── 配置区 ───────────────
INPUT_DIR        = "./input"    # 输入文件夹路径
OUTPUT_DIR       = "./output"   # 输出文件夹路径（自动创建）
CROP_RATIO       = 1.0          # 裁剪保留比例（宽高各保留该比例）
BRIGHTNESS_DELTA = +20          # 亮度偏移值（-255 ~ +255）
HH               = 0          # 底部偏移像素（向上移动锚点）
LL               = 0            # 水平偏移像素（左右各扩展）
ROTATE_DEGREE    = 0            # 旋转角度（顺时针）：0 / 90 / 180 / 270，或任意角度
                                #   0/90/180/270 → 自动使用 transpose（无损边缘，无黑边）
                                #   其他角度     → 使用 rotate 滤镜（默认填充黑色边角）
                                # 旋转后会自动裁剪回旋转前的宽高比（最大内接矩形）
SPEED_FACTOR     = 1.0          # 播放速度倍数（1.0=原速，2.0=两倍速，0.5=半速）
                                #   视频：setpts；音频：atempo（自动串联以突破 0.5~2.0 限制）
SUPPORTED_EXT    = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv", ".wmv", ".m4v"}
FILENAME_FILTER  = ""           # 文件名必须包含此字符串才会被处理，留空 "" 则处理全部
VIDEO_CODEC      = "libx264"    # 输出视频编码器，可选 libx265 / copy
AUDIO_CODEC      = "aac"        # 输出音频编码器，copy 则不重编码
CRF              = 18           # 视频质量（0=无损，23=默认，数值越小质量越高）
PRESET           = "fast"       # 编码速度预设：ultrafast/fast/medium/slow
# ─────────────────────────────────────


def check_ffmpeg():
    """检查 ffmpeg 是否已安装"""
    try:
        subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True, check=True
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("[错误] 未检测到 ffmpeg，请先安装：https://ffmpeg.org/download.html")
        sys.exit(1)


def get_video_info(file: Path) -> dict:
    """使用 ffprobe 获取视频宽高等元信息"""
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        str(file)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    info = json.loads(result.stdout)

    for stream in info.get("streams", []):
        if stream.get("codec_type") == "video":
            return {
                "width":  stream["width"],
                "height": stream["height"],
            }
    raise ValueError(f"无法从文件中找到视频流：{file.name}")


def build_rotate_filter(degree: float) -> str:
    """
    构建旋转滤镜字符串。

    0/90/180/270° → transpose 组合（无黑边，像素对齐）
    其他角度      → rotate 滤镜（黑色填充边角，保持原始画布尺寸）
    """
    deg = degree % 360
    if deg == 0:
        return ""
    elif deg == 90:
        return "transpose=1"          # 顺时针 90°
    elif deg == 180:
        return "transpose=1,transpose=1"
    elif deg == 270:
        return "transpose=2"          # 逆时针 90° = 顺时针 270°
    else:
        # rotate 滤镜：角度单位为弧度，顺时针为负值（ffmpeg 默认逆时针为正）
        rad = -math.radians(deg)
        return f"rotate={rad:.6f}"


def build_post_rotate_crop(frame_w: int, frame_h: int,
                           target_w: int, target_h: int,
                           degree: float) -> str:
    """
    旋转后裁剪回目标宽高比（最大内接矩形，居中）。

    参数
    ----
    frame_w / frame_h : 旋转后的画面尺寸
        - 0°/180°   : 与旋转前相同（target_w, target_h）
        - 90°/270°  : transpose 后变为 (target_h, target_w)
        - 其他角度   : rotate 滤镜保持原尺寸 (target_w, target_h)
    target_w / target_h : 旋转前的画面尺寸（即目标宽高比的来源）
    degree : 旋转角度（顺时针）

    返回 crop=W:H:X:Y 滤镜字符串，若无需裁剪则返回空串。

    算法
    ----
    1. 0°/180°：宽高比不变，跳过。
    2. 90°/270°（transpose）：画面变为 (target_h, target_w)，
       在此画面内求满足宽高比 target_w:target_h 的最大矩形。
       - 受宽约束：crop_w = frame_w, crop_h = frame_w / r
       - 受高约束：crop_h = frame_h, crop_w = frame_h * r
       取两者中合法（不超出画面）且面积更大的方案。
    3. 任意角度：rotate 滤镜保持 (target_w, target_h) 画布，
       旋转内容在画布内形成带黑边的旋转矩形。
       求满足宽高比 r=target_w/target_h 的最大内接轴对齐矩形：
         cw ≤ target_w / (|cosθ| + |sinθ|/r)
         cw ≤ target_h / (|sinθ| + |cosθ|/r)
       两个约束取小值，ch = cw / r，居中放置。
    """
    deg = degree % 360
    r = target_w / target_h     # 目标宽高比

    # ── 情形 1：0° / 180°，宽高比不变 ──
    if deg == 0 or deg == 180:
        return ""

    # ── 情形 2：90° / 270°（transpose），画面已翻转为 frame_w×frame_h ──
    if deg == 90 or deg == 270:
        # 方案 A：受宽约束
        cw_a = frame_w
        ch_a = frame_w / r
        # 方案 B：受高约束
        ch_b = frame_h
        cw_b = frame_h * r
        # 选面积更大的合法方案
        if ch_a <= frame_h + 0.5:   # 方案 A 合法（不超出高度）
            cw, ch = cw_a, ch_a
        else:                        # 方案 B（Portrait 素材旋转后用此方案）
            cw, ch = cw_b, ch_b

        cw = int(cw) & ~1           # 偶数对齐（H.264 要求）
        ch = int(ch) & ~1
        x  = (frame_w - cw) // 2
        y  = (frame_h - ch) // 2
        return f"crop={cw}:{ch}:{x}:{y}"

    # ── 情形 3：任意角度，rotate 滤镜，画布保持 target_w×target_h ──
    cos_t = abs(math.cos(math.radians(deg)))
    sin_t = abs(math.sin(math.radians(deg)))

    # 内接矩形宽的两个上界（以 cw 为变量，ch = cw/r）
    denom1 = cos_t + sin_t / r          # 受 target_w 约束
    denom2 = sin_t + cos_t / r          # 受 target_h 约束

    cw = min(
        frame_w / denom1 if denom1 > 1e-9 else float("inf"),
        frame_h / denom2 if denom2 > 1e-9 else float("inf"),
    )
    ch = cw / r

    cw = int(cw) & ~1
    ch = int(ch) & ~1
    x  = (frame_w - cw) // 2
    y  = (frame_h - ch) // 2
    return f"crop={cw}:{ch}:{x}:{y}"


def build_atempo_filter(speed: float) -> str:
    """
    构建音频变速滤镜链。
    atempo 单次只支持 [0.5, 2.0]，超出范围时串联多个。
    speed <= 0 时抛出异常。
    """
    if speed <= 0:
        raise ValueError(f"SPEED_FACTOR 必须大于 0，当前值：{speed}")

    filters = []
    remaining = speed

    if remaining > 1.0:
        while remaining > 2.0:
            filters.append("atempo=2.0")
            remaining /= 2.0
        filters.append(f"atempo={remaining:.6f}")
    elif remaining < 1.0:
        while remaining < 0.5:
            filters.append("atempo=0.5")
            remaining /= 0.5
        filters.append(f"atempo={remaining:.6f}")
    # remaining == 1.0：不需要音频变速滤镜

    return ",".join(filters)


def build_ffmpeg_filter(width: int, height: int,
                        crop_ratio: float,
                        brightness_delta: int,
                        hh: int, ll: int,
                        rotate_degree: float = 0,
                        speed_factor: float = 1.0) -> tuple[str, str]:
    """
    构建视频和音频 ffmpeg filtergraph 字符串。
    返回 (video_filter, audio_filter)。

    处理顺序：
      1. 亮度调整（eq）
      2. 预裁剪（crop，以底边中心为锚）
      3. 旋转（transpose 或 rotate）
      4. 旋转后裁回原宽高比（crop，最大内接矩形）← 新增
      5. 视频变速（setpts）
    音频：atempo 串联链

    裁剪逻辑（步骤 2）：
        new_w  = int(width  * ratio)
        new_h  = int(height * ratio)
        left   = (width - new_w) // 2 + LL
        right  = left + new_w + LL
        top    = height - new_h - HH
        out_w  = new_w + LL, out_h = new_h
    """
    # ── 步骤 1 & 2：亮度 + 预裁剪 ──
    new_w = int(width  * crop_ratio)
    new_h = int(height * crop_ratio)

    left  = (width - new_w) // 2 + ll
    right = left + new_w + ll
    top   = height - new_h - hh

    out_w = right - left   # 预裁剪后的宽度
    out_h = new_h          # 预裁剪后的高度

    br = brightness_delta / 255.0
    br = max(-1.0, min(1.0, br))

    vf_parts = [f"eq=brightness={br:.6f}", f"crop={out_w}:{out_h}:{left}:{top}"]

    # ── 步骤 3：旋转 ──
    rotate_filt = build_rotate_filter(rotate_degree)
    if rotate_filt:
        vf_parts.append(rotate_filt)

    # ── 步骤 4：旋转后裁回原宽高比（新增）──
    # 旋转后画面的实际尺寸
    deg = rotate_degree % 360
    if deg in (90, 270):
        post_frame_w, post_frame_h = out_h, out_w   # transpose 后宽高互换
    else:
        post_frame_w, post_frame_h = out_w, out_h   # rotate/0°/180° 保持画布不变

    post_crop = build_post_rotate_crop(
        post_frame_w, post_frame_h,
        out_w, out_h,               # 旋转前尺寸（即目标宽高比的来源）
        rotate_degree
    )
    if post_crop:
        vf_parts.append(post_crop)

    # ── 步骤 5：视频变速 ──
    if abs(speed_factor - 1.0) > 1e-6:
        vf_parts.append(f"setpts=PTS/{speed_factor:.6f}")

    video_filter = ",".join(vf_parts)

    # ── 音频变速 ──
    audio_filter = build_atempo_filter(speed_factor) if abs(speed_factor - 1.0) > 1e-6 else ""

    return video_filter, audio_filter


def process_video(file: Path, out_file: Path, video_filter: str, audio_filter: str):
    """调用 ffmpeg 处理单个视频"""
    cmd = [
        "ffmpeg",
        "-y",                          # 覆盖已存在的输出文件
        "-i", str(file),
        "-vf", video_filter,
        "-c:v", VIDEO_CODEC,
        "-crf", str(CRF),
        "-preset", PRESET,
    ]

    if audio_filter:
        cmd += ["-af", audio_filter]

    cmd += ["-c:a", AUDIO_CODEC, str(out_file)]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr[-500:])


def process_videos(input_dir: str, output_dir: str):
    check_ffmpeg()

    input_path  = Path(input_dir)
    output_path = Path(output_dir)

    if not input_path.exists():
        print(f"[错误] 输入文件夹不存在：{input_path.resolve()}")
        sys.exit(1)

    output_path.mkdir(parents=True, exist_ok=True)

    video_files = [
        f for f in input_path.rglob("*")
        if f.is_file()
        and f.suffix.lower() in SUPPORTED_EXT
        and (not FILENAME_FILTER or FILENAME_FILTER in f.stem)
    ]

    if not video_files:
        filter_hint = f"（文件名过滤：包含 '{FILENAME_FILTER}'）" if FILENAME_FILTER else ""
        print(f"[提示] 未在 {input_path.resolve()} 找到匹配的视频文件 {filter_hint}")
        print(f"       支持格式：{', '.join(sorted(SUPPORTED_EXT))}")
        return

    total = len(video_files)
    filter_hint = f"  文件名过滤：包含 '{FILENAME_FILTER}'" if FILENAME_FILTER else ""
    rotate_hint = f"{ROTATE_DEGREE}°" if ROTATE_DEGREE % 360 != 0 else "无"
    speed_hint  = f"{SPEED_FACTOR}x" if abs(SPEED_FACTOR - 1.0) > 1e-6 else "原速"

    print(f"共找到 {total} 个视频，开始处理...\n")
    print(f"  裁剪比例：{CROP_RATIO}  亮度偏移：{BRIGHTNESS_DELTA:+d}{filter_hint}")
    print(f"  底部偏移 HH={HH}px  水平偏移 LL={LL}px")
    print(f"  旋转：{rotate_hint}  速度：{speed_hint}")
    if ROTATE_DEGREE % 360 != 0:
        print(f"  旋转后自动裁回原宽高比（最大内接矩形）\n")
    else:
        print()

    for idx, file in enumerate(video_files, 1):
        try:
            info = get_video_info(file)
            w, h = info["width"], info["height"]
            vf, af = build_ffmpeg_filter(
                w, h, CROP_RATIO, BRIGHTNESS_DELTA, HH, LL,
                ROTATE_DEGREE, SPEED_FACTOR
            )

            out_file = output_path / file.name

            print(f"[{idx:>4}/{total}] 处理中  {file.parent.name}/{file.name}  ({w}x{h})")
            print(f"           视频滤镜：{vf}")
            if af:
                print(f"           音频滤镜：{af}")

            process_video(file, out_file, vf, af)
            print(f"[{idx:>4}/{total}] 完成   -> {file.name}\n")

        except Exception as e:
            print(f"[{idx:>4}/{total}] 失败   {file.parent.name}/{file.name}  ->  {e}\n")

    print(f"处理完成！输出目录：{output_path.resolve()}")


if __name__ == "__main__":
    if len(sys.argv) >= 2:
        INPUT_DIR = sys.argv[1]
    if len(sys.argv) >= 3:
        OUTPUT_DIR = sys.argv[2]

    process_videos(INPUT_DIR, OUTPUT_DIR)