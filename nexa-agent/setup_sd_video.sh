#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  Nexa AI — SD XL + Video Generation Setup for RTX 3090
#  Configura Stable Diffusion XL y AnimateDiff para generación
#  de fotos y videos locales en la tarjeta gráfica RTX 3090
# ═══════════════════════════════════════════════════════════════════
set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║    Nexa AI — SD XL + Video Gen Setup (RTX 3090 24GB)       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"

# Activate venv if exists
if [ -d "$VENV_DIR" ]; then
    source "$VENV_DIR/bin/activate"
    echo "✅ Virtual environment activated"
else
    echo "❌ Virtual environment not found. Run install.sh first."
    exit 1
fi

# ─── Check GPU ─────────────────────────────────────────────────────
echo ""
echo "🔍 Checking GPU..."
if command -v nvidia-smi &> /dev/null; then
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null)
    GPU_VRAM=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader 2>/dev/null)
    echo "   ✅ GPU: $GPU_NAME ($GPU_VRAM)"
    
    # Verify it's an RTX 3090 or better
    if echo "$GPU_NAME" | grep -qi "3090\|4090\|A100\|H100"; then
        echo "   ✅ GPU confirmed: 24GB+ VRAM — SD XL compatible"
    else
        echo "   ⚠️  GPU may not have enough VRAM for SD XL (needs 8GB+)"
    fi
else
    echo "   ⚠️  nvidia-smi not found. Cannot verify GPU."
fi

# ─── Install PyTorch with CUDA ─────────────────────────────────────
echo ""
echo "📦 Step 1: Installing PyTorch with CUDA 12.1..."

if python -c "import torch; assert torch.cuda.is_available()" 2>/dev/null; then
    TORCH_VERSION=$(python -c "import torch; print(torch.__version__)")
    CUDA_AVAIL=$(python -c "import torch; print(torch.cuda.is_available())")
    echo "   ✅ PyTorch $TORCH_VERSION already installed (CUDA: $CUDA_AVAIL)"
else
    echo "   📥 Installing PyTorch with CUDA support..."
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 -q
    echo "   ✅ PyTorch installed"
fi

# ─── Install Diffusers + Transformers ──────────────────────────────
echo ""
echo "📦 Step 2: Installing Diffusers + Transformers..."
pip install diffusers>=0.31.0 transformers>=4.46.0 accelerate>=1.1.0 safetensors>=0.4.0 -q
pip install invisible-watermark>=0.2.0 -q  # Required by SD XL
echo "   ✅ Diffusers + Transformers installed"

# ─── Install Image/Video deps ──────────────────────────────────────
echo ""
echo "📦 Step 3: Installing image/video dependencies..."
pip install Pillow>=10.4.0 imageio[ffmpeg]>=2.36.0 opencv-python-headless>=4.10.0 -q
echo "   ✅ Image/Video dependencies installed"

# ─── Download SD XL Base Model ─────────────────────────────────────
echo ""
echo "📦 Step 4: Downloading Stable Diffusion XL Base 1.0..."
echo "   ⏳ This will download ~6.5GB. Please be patient..."

MODEL_DIR="$SCRIPT_DIR/models/sd-xl-base"
mkdir -p "$MODEL_DIR"

python << 'PYEOF'
import os
import sys
model_dir = os.environ.get("MODEL_DIR", "")

try:
    from diffusers import StableDiffusionXLPipeline
    import torch
    
    print("   📥 Downloading SD XL Base 1.0 from HuggingFace...")
    print("   (First download only — cached for future use)")
    
    pipe = StableDiffusionXLPipeline.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0",
        torch_dtype=torch.float16,
        use_safetensors=True,
        variant="fp16",
    )
    
    if model_dir:
        pipe.save_pretrained(model_dir)
        print(f"   ✅ Model saved to: {model_dir}")
    
    # Test generation
    print("   🧪 Testing image generation...")
    pipe = pipe.to("cuda")
    pipe.enable_model_cpu_offload()
    
    image = pipe(
        prompt="A beautiful sunset over mountains, photorealistic, 4K",
        num_inference_steps=20,
        guidance_scale=7.5,
    ).images[0]
    
    test_path = os.path.join(model_dir, "..", "test_generation.png")
    image.save(test_path)
    print(f"   ✅ Test image saved: {test_path}")
    
    # Clean up GPU memory
    del pipe
    torch.cuda.empty_cache()
    print("   ✅ GPU memory freed")
    
except Exception as e:
    print(f"   ⚠️  SD XL setup error: {e}")
    print("   You can download manually later:")
    print("   python -c \"from diffusers import StableDiffusionXLPipeline; StableDiffusionXLPipeline.from_pretrained('stabilityai/stable-diffusion-xl-base-1.0', torch_dtype=torch.float16)\"")
    sys.exit(0)  # Don't fail the whole script
PYEOF

export MODEL_DIR="$MODEL_DIR"

# ─── Download AnimateDiff for Video Generation ─────────────────────
echo ""
echo "📦 Step 5: Setting up Video Generation (AnimateDiff)..."
echo "   ⏳ This will download ~2GB..."

VIDEO_MODEL_DIR="$SCRIPT_DIR/models/animatediff"
mkdir -p "$VIDEO_MODEL_DIR"

python << 'PYEOF'
import os
import sys

try:
    import torch
    from diffusers import AnimateDiffPipeline, DDIMScheduler, MotionAdapter
    
    print("   📥 Downloading AnimateDiff Motion Adapter...")
    
    adapter = MotionAdapter.from_pretrained(
        "guoyww/animatediff-motion-adapter-v1-5-2",
        torch_dtype=torch.float16,
    )
    
    print("   📥 Loading Stable Diffusion 1.5 + AnimateDiff...")
    
    pipe = AnimateDiffPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        motion_adapter=adapter,
        torch_dtype=torch.float16,
    )
    
    scheduler = DDIMScheduler.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        subfolder="scheduler",
        clip_sample=False,
        timestep_spacing="linspace",
        steps_offset=1,
    )
    pipe.scheduler = scheduler
    
    # Enable memory-efficient attention
    pipe.enable_vae_slicing()
    pipe.enable_model_cpu_offload()
    
    # Save
    video_model_dir = os.environ.get("VIDEO_MODEL_DIR", "")
    if video_model_dir:
        pipe.save_pretrained(video_model_dir)
        print(f"   ✅ Video model saved to: {video_model_dir}")
    
    # Test video generation (4 frames only for speed)
    print("   🧪 Testing video generation (4 frames)...")
    pipe = pipe.to("cuda")
    
    video_frames = pipe(
        prompt="A cat walking in a garden, cinematic",
        num_frames=4,
        num_inference_steps=10,
        guidance_scale=7.5,
    ).frames[0]
    
    # Save as GIF
    test_path = os.path.join(video_model_dir, "..", "test_video.gif")
    video_frames[0].save(
        test_path,
        save_all=True,
        append_images=video_frames[1:],
        duration=250,
        loop=0,
    )
    print(f"   ✅ Test video saved: {test_path}")
    
    # Clean up
    del pipe
    del adapter
    torch.cuda.empty_cache()
    print("   ✅ GPU memory freed")
    
except ImportError as e:
    print(f"   ⚠️  AnimateDiff not available: {e}")
    print("   Install with: pip install diffusers>=0.31.0 transformers accelerate")
    sys.exit(0)
except Exception as e:
    print(f"   ⚠️  Video gen setup error: {e}")
    print("   Video generation will be available once models are downloaded.")
    sys.exit(0)
PYEOF

# ─── Create Generation Service Script ──────────────────────────────
echo ""
echo "📝 Step 6: Creating generation service scripts..."

# Image generation service
cat > "$SCRIPT_DIR/generate_image.py" << 'PYEOF'
#!/usr/bin/env python3
"""
Stable Diffusion XL Image Generator
Generates images on RTX 3090 using SD XL 1.0
Usage: python generate_image.py "your prompt" [--width 1024] [--height 1024] [--steps 30] [--output output.png]
"""
import argparse
import os
import sys
import time
import json

def main():
    parser = argparse.ArgumentParser(description="Generate images with SD XL on RTX 3090")
    parser.add_argument("prompt", help="Image description prompt")
    parser.add_argument("--negative", default="", help="Negative prompt")
    parser.add_argument("--width", type=int, default=1024, help="Width (multiple of 8)")
    parser.add_argument("--height", type=int, default=1024, help="Height (multiple of 8)")
    parser.add_argument("--steps", type=int, default=30, help="Inference steps")
    parser.add_argument("--guidance", type=float, default=7.5, help="Guidance scale")
    parser.add_argument("--seed", type=int, default=-1, help="Random seed (-1 for random)")
    parser.add_argument("--output", default="", help="Output filename")
    parser.add_argument("--model", default="stabilityai/stable-diffusion-xl-base-1.0", help="Model name or path")
    args = parser.parse_args()
    
    import torch
    from diffusers import StableDiffusionXLPipeline
    
    print(f"[SD XL] Loading model: {args.model}")
    pipe = StableDiffusionXLPipeline.from_pretrained(
        args.model,
        torch_dtype=torch.float16,
        use_safetensors=True,
        variant="fp16",
    )
    pipe = pipe.to("cuda")
    pipe.enable_model_cpu_offload()
    
    # Seed
    generator = None
    if args.seed >= 0:
        generator = torch.Generator("cuda").manual_seed(args.seed)
    
    # Generate
    width = (args.width // 8) * 8
    height = (args.height // 8) * 8
    
    print(f"[SD XL] Generating: {args.prompt[:80]}...")
    start = time.time()
    
    image = pipe(
        prompt=args.prompt,
        negative_prompt=args.negative or "low quality, blurry, distorted, watermark",
        width=width,
        height=height,
        num_inference_steps=args.steps,
        guidance_scale=args.guidance,
        generator=generator,
    ).images[0]
    
    elapsed = time.time() - start
    
    # Save
    output_dir = os.path.join(os.path.dirname(__file__), "..", "public", "uploads")
    os.makedirs(output_dir, exist_ok=True)
    
    filename = args.output or f"sd_{int(time.time())}.png"
    if not filename.endswith(".png"):
        filename += ".png"
    filepath = os.path.join(output_dir, filename)
    image.save(filepath)
    
    # Print result as JSON
    result = {
        "status": "success",
        "filename": filename,
        "filepath": filepath,
        "prompt": args.prompt,
        "size": f"{width}x{height}",
        "steps": args.steps,
        "elapsed_seconds": round(elapsed, 2),
    }
    print(json.dumps(result, indent=2))
    
    # Clean up
    del pipe
    torch.cuda.empty_cache()

if __name__ == "__main__":
    main()
PYEOF

# Video generation service
cat > "$SCRIPT_DIR/generate_video.py" << 'PYEOF'
#!/usr/bin/env python3
"""
AnimateDiff Video Generator
Generates short videos on RTX 3090 using AnimateDiff + SD 1.5
Usage: python generate_video.py "your prompt" [--frames 16] [--output output.gif]
"""
import argparse
import os
import sys
import time
import json

def main():
    parser = argparse.ArgumentParser(description="Generate videos with AnimateDiff on RTX 3090")
    parser.add_argument("prompt", help="Video description prompt")
    parser.add_argument("--negative", default="", help="Negative prompt")
    parser.add_argument("--frames", type=int, default=16, help="Number of frames (4-32)")
    parser.add_argument("--steps", type=int, default=25, help="Inference steps")
    parser.add_argument("--guidance", type=float, default=7.5, help="Guidance scale")
    parser.add_argument("--fps", type=int, default=8, help="Frames per second")
    parser.add_argument("--seed", type=int, default=-1, help="Random seed (-1 for random)")
    parser.add_argument("--output", default="", help="Output filename")
    args = parser.parse_args()
    
    import torch
    from diffusers import AnimateDiffPipeline, DDIMScheduler, MotionAdapter
    
    print("[AnimateDiff] Loading model...")
    adapter = MotionAdapter.from_pretrained(
        "guoyww/animatediff-motion-adapter-v1-5-2",
        torch_dtype=torch.float16,
    )
    
    pipe = AnimateDiffPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        motion_adapter=adapter,
        torch_dtype=torch.float16,
    )
    
    scheduler = DDIMScheduler.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        subfolder="scheduler",
        clip_sample=False,
        timestep_spacing="linspace",
        steps_offset=1,
    )
    pipe.scheduler = scheduler
    
    pipe.enable_vae_slicing()
    pipe.enable_model_cpu_offload()
    pipe = pipe.to("cuda")
    
    # Seed
    generator = None
    if args.seed >= 0:
        generator = torch.Generator("cuda").manual_seed(args.seed)
    
    # Generate
    num_frames = max(4, min(args.frames, 32))
    
    print(f"[AnimateDiff] Generating {num_frames} frames: {args.prompt[:80]}...")
    start = time.time()
    
    video_frames = pipe(
        prompt=args.prompt,
        negative_prompt=args.negative or "low quality, blurry, distorted",
        num_frames=num_frames,
        num_inference_steps=args.steps,
        guidance_scale=args.guidance,
        generator=generator,
    ).frames[0]
    
    elapsed = time.time() - start
    
    # Save as GIF
    output_dir = os.path.join(os.path.dirname(__file__), "..", "public", "uploads")
    os.makedirs(output_dir, exist_ok=True)
    
    filename = args.output or f"video_{int(time.time())}.gif"
    if not filename.endswith(".gif") and not filename.endswith(".mp4"):
        filename += ".gif"
    filepath = os.path.join(output_dir, filename)
    
    if filename.endswith(".gif"):
        video_frames[0].save(
            filepath,
            save_all=True,
            append_images=video_frames[1:],
            duration=1000 // args.fps,
            loop=0,
        )
    else:
        # Save as MP4
        import imageio
        writer = imageio.get_writer(filepath, fps=args.fps)
        for frame in video_frames:
            import numpy as np
            writer.append_data(np.array(frame))
        writer.close()
    
    # Print result as JSON
    result = {
        "status": "success",
        "filename": filename,
        "filepath": filepath,
        "prompt": args.prompt,
        "frames": num_frames,
        "fps": args.fps,
        "duration_seconds": num_frames / args.fps,
        "elapsed_seconds": round(elapsed, 2),
    }
    print(json.dumps(result, indent=2))
    
    # Clean up
    del pipe
    del adapter
    torch.cuda.empty_cache()

if __name__ == "__main__":
    main()
PYEOF

chmod +x "$SCRIPT_DIR/generate_image.py" "$SCRIPT_DIR/generate_video.py"

echo "   ✅ Generation scripts created"

# ─── Update Agent Config ───────────────────────────────────────────
echo ""
echo "📝 Step 7: Updating agent configuration..."

# Update .env to enable image and video gen
if [ -f "$SCRIPT_DIR/.env" ]; then
    sed -i 's/ENABLE_IMAGE_GEN=.*/ENABLE_IMAGE_GEN=true/' "$SCRIPT_DIR/.env"
    sed -i 's/ENABLE_VIDEO_GEN=.*/ENABLE_VIDEO_GEN=true/' "$SCRIPT_DIR/.env"
    echo "   ✅ .env updated: image + video generation enabled"
else
    echo "   ⚠️  .env not found. Run install.sh first."
fi

# ─── Final Status ──────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║            ✅ SETUP COMPLETE!                                ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║  🎨 Image Generation:                                       ║"
echo "║     python generate_image.py \"a sunset over mountains\"      ║"
echo "║                                                              ║"
echo "║  🎬 Video Generation:                                       ║"
echo "║     python generate_video.py \"a cat walking\" --frames 16    ║"
echo "║                                                              ║"
echo "║  🌐 Via API:                                                ║"
echo "║     POST http://localhost:8000/generate/image               ║"
echo "║     POST http://localhost:8000/generate/video               ║"
echo "║                                                              ║"
echo "║  💬 Via Chat:                                               ║"
echo "║     Just ask! \"Generate an image of...\" or                   ║"
echo "║     \"Create a video of...\"                                   ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
