$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$scriptRows = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'script.json') | ConvertFrom-Json
$temporary = Join-Path ([IO.Path]::GetTempPath()) ("elp365-demo-" + [guid]::NewGuid())
$null = New-Item -ItemType Directory $temporary
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(24000, 16, 1)
try {
    foreach ($index in 0..($scriptRows.Count - 1)) {
        $row = $scriptRows[$index]
        $voice.SelectVoice('Microsoft Zira Desktop')
        $voice.Rate = @{ marco = -1; erica = 2; mia = 1; dan = -2 }[$row.speaker]
        $audioFile = Join-Path $temporary "$index.wav"
        $voice.SetOutputToWaveFile($audioFile, $format)
        $voice.Speak($row.en)
        $voice.SetOutputToNull()
    }
    @'
import json
import subprocess
import sys
import wave
from pathlib import Path

root = Path(sys.argv[1])
temporary = Path(sys.argv[2])
rows = json.loads((root / "script.json").read_text(encoding="utf-8"))
frames = []
position = 0
silence = bytes(24000 * 2 // 4)
for index, row in enumerate(rows):
    with wave.open(str(temporary / f"{index}.wav"), "rb") as recording:
        speech = recording.readframes(recording.getnframes())
    clip = speech + silence
    row["start"] = round(position / 48000, 4)
    position += len(clip)
    row["end"] = round(position / 48000, 4)
    frames.append(clip)
source = temporary / "episode.wav"
with wave.open(str(source), "wb") as recording:
    recording.setparams((1, 2, 24000, 0, "NONE", "not compressed"))
    recording.writeframes(b"".join(frames))
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(source),
                "-map_metadata", "-1", "-b:a", "48k", str(root / "episode.mp3")], check=True)
payload = json.dumps({"duration": rows[-1]["end"], "rows": rows}, ensure_ascii=False, indent=2)
(root / "recording.js").write_text(f"window.ELP_DEMO_RECORDING = {payload};\n", encoding="utf-8", newline="\n")
'@ | python -X utf8 - $PSScriptRoot $temporary
    if ($LASTEXITCODE -ne 0) { throw 'Could not build preview audio' }
}
finally {
    $voice.Dispose()
    Get-ChildItem -LiteralPath $temporary -File | Remove-Item
    Remove-Item -LiteralPath $temporary
}
