# Next steps checklist

1. Plug in **ESP32** (CP210x) and **Arduino Mega** USB cables (data cables).
2. Confirm ports:
   - `python -m platformio device list`
   - Expect Mega like `Arduino Mega 2560 (COMx)` and ESP32 like `Silicon Labs CP210x (COMy)`.
3. Upload Mega:
   - `cd biosignal-project/mega`
   - `python -m platformio run --jobs 1 -t upload --upload-port COMx`
4. Upload ESP32 (hold **BOOT**, tap **EN/RESET** if connect fails):
   - `cd biosignal-project/esp32`
   - `python -m platformio run -t upload --upload-port COMy`
5. Monitor ESP32 at 115200 — look for `# ADS1015 detected` and CSV lines.
6. If ADS1015 missing, upload `tools/i2c_scan` and check for `0x48`.
7. Monitor Mega — expect `# LCD: PROJECT / STARTING`, test mode, then READY.
8. Keep common GND; do **not** feed Mega 5 V GPIO into ESP32 pins.
9. Electrodes disconnected while USB/mains-powered for first bring-up.
