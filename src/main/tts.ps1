# Synthesises English speech to a WAV file using Windows SAPI.
# Chromium's speechSynthesis is unreliable here (returns 0-1 voices, and falls back to the
# Turkish system voice when no en-GB voice exists), so audio is produced in the main process.
param(
  [Parameter(Mandatory = $true)][string]$Mode,
  [string]$In,
  [string]$Out,
  [int]$Rate = 0,
  [string]$Voice = ''
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$ss = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $installed = @($ss.GetInstalledVoices() | Where-Object { $_.Enabled })

  if ($Mode -eq 'list') {
    $installed | ForEach-Object {
      [PSCustomObject]@{ name = $_.VoiceInfo.Name; lang = $_.VoiceInfo.Culture.Name; gender = "$($_.VoiceInfo.Gender)" }
    } | ConvertTo-Json -Compress -Depth 3
    return
  }

  $pick = $null
  if ($Voice) { $pick = $installed | Where-Object { $_.VoiceInfo.Name -eq $Voice } | Select-Object -First 1 }
  if (-not $pick) { $pick = $installed | Where-Object { $_.VoiceInfo.Culture.Name -like 'en-GB*' } | Select-Object -First 1 }
  if (-not $pick) { $pick = $installed | Where-Object { $_.VoiceInfo.Culture.Name -like 'en*' } | Select-Object -First 1 }
  if (-not $pick) { throw 'no-english-voice' }
  $ss.SelectVoice($pick.VoiceInfo.Name)
  $ss.Rate = $Rate

  $text = [IO.File]::ReadAllText($In, [Text.Encoding]::UTF8)
  # 16 kHz mono is ample for speech and halves what crosses the IPC boundary
  $fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
  $ss.SetOutputToWaveFile($Out, $fmt)
  $ss.Speak($text)
  Write-Output $pick.VoiceInfo.Name
}
finally { $ss.Dispose() }
