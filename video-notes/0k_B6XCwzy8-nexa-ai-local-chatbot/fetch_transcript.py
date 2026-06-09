import json
import os
from pathlib import Path


def main() -> None:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi  # type: ignore
    except Exception as e:
        raise SystemExit(
            "Falta la dependencia youtube-transcript-api.\n"
            "Instala en esta carpeta con:\n"
            "  python3 -m pip install -t ./.deps youtube-transcript-api\n"
            "Y ejecuta con:\n"
            "  PYTHONPATH=./.deps python3 fetch_transcript.py\n"
        ) from e

    video_id = os.environ.get("VIDEO_ID", "0k_B6XCwzy8")
    out_dir = Path(__file__).resolve().parent
    out_txt = out_dir / "transcript.txt"
    out_json = out_dir / "transcript.json"

    api = YouTubeTranscriptApi()
    transcript = api.fetch(video_id, languages=["es", "en"])

    lines = [snippet.text for snippet in transcript]
    json_items = [{"text": snippet.text, "start": snippet.start, "duration": snippet.duration} for snippet in transcript]

    out_txt.write_text("\n".join(lines) + "\n", encoding="utf-8")
    out_json.write_text(json.dumps(json_items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"OK: {out_txt}")
    print(f"OK: {out_json}")


if __name__ == "__main__":
    main()
