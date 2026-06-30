# Raspberry Pi NFC Check-In Setup

## Hardware

| Part | Notes |
|------|-------|
| Raspberry Pi Zero 2 W | Any Pi works; Zero 2 W is cheapest |
| RC522 RFID/NFC module | ~$5, widely available |
| Green LED + 220Ω resistor | GPIO 17 |
| Red LED + 220Ω resistor | GPIO 27 |
| Active buzzer | GPIO 22 — must be **active** (not passive) |
| Micro USB power supply | 5V 1A minimum |
| Project enclosure | Optional but recommended |

### RC522 wiring (SPI)

| RC522 pin | Pi pin (BCM) | Pi physical pin |
|-----------|-------------|-----------------|
| SDA (CS)  | GPIO 8      | Pin 24          |
| SCK       | GPIO 11     | Pin 23          |
| MOSI      | GPIO 10     | Pin 19          |
| MISO      | GPIO 9      | Pin 21          |
| GND       | GND         | Pin 6           |
| RST       | GPIO 25     | Pin 22          |
| 3.3V      | 3.3V        | Pin 1           |

### LED + buzzer wiring

- Green LED anode → 220Ω resistor → GPIO 17 (Pin 11); cathode → GND
- Red LED anode → 220Ω resistor → GPIO 27 (Pin 13); cathode → GND
- Active buzzer + → GPIO 22 (Pin 15); buzzer − → GND

## Software Setup

### 1. Flash Raspberry Pi OS Lite (64-bit)

Use [Raspberry Pi Imager](https://www.raspberrypi.com/software/). In advanced options:
- Enable SSH
- Set hostname (e.g. `matconnect-reader`)
- Set WiFi credentials

### 2. Enable SPI

```bash
sudo raspi-config
# Interface Options → SPI → Enable
sudo reboot
```

### 3. Install dependencies

```bash
sudo apt update && sudo apt install -y python3-pip python3-dev
pip3 install mfrc522 RPi.GPIO requests python-dotenv
```

### 4. Deploy the script

```bash
sudo mkdir -p /opt/matconnect
sudo cp checkin.py /opt/matconnect/
sudo chmod +x /opt/matconnect/checkin.py
```

### 5. Configure environment

```bash
sudo cp checkin.env.example /etc/checkin.env
sudo nano /etc/checkin.env
# Fill in MATCONNECT_URL and RFID_API_KEY
sudo chmod 600 /etc/checkin.env
```

The `RFID_API_KEY` must match the `RFID_API_KEY` environment variable set in your
Vercel project settings.

### 6. Install the systemd service

```bash
sudo tee /etc/systemd/system/matconnect-checkin.service > /dev/null << 'EOF'
[Unit]
Description=MatConnect NFC Check-In Reader
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/matconnect/checkin.py
Restart=always
RestartSec=5
User=root
EnvironmentFile=/etc/checkin.env
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable matconnect-checkin
sudo systemctl start matconnect-checkin
```

### 7. Verify it's running

```bash
sudo systemctl status matconnect-checkin
sudo journalctl -u matconnect-checkin -f
```

Tap a wristband. You should see `Tag: AABBCCDD` in the logs and get LED/buzzer feedback.

## Wristband Assignment

You need a **second** USB NFC reader at the admin desk to assign wristbands.
Any USB reader with HID keyboard emulation works (search "USB NFC reader HID").

When the reader is plugged in:
1. Open the member profile in MatConnect
2. Click **Assign Wristband** → **Tap to assign**
3. Tap the wristband on the USB reader — the UID auto-fills
4. Click **Confirm**

## Troubleshooting

**Green LED never fires / always red:**
- Check `RFID_API_KEY` matches in Vercel env and `/etc/checkin.env`
- Check `MATCONNECT_URL` points to the live site (not localhost)

**Script crashes on import:**
- Run `sudo raspi-config` and confirm SPI is enabled

**No response at all:**
- Check wiring — RC522 must be on the correct SPI pins
- Test: `sudo python3 -c "import mfrc522; print('OK')"`
