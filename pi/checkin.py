#!/usr/bin/env python3
"""MatConnect NFC check-in reader — Raspberry Pi + RC522."""

import os
import time
import signal
import sys

from dotenv import load_dotenv
import RPi.GPIO as GPIO
import mfrc522
import requests

load_dotenv("/etc/checkin.env")

URL = os.environ["MATCONNECT_URL"].rstrip("/") + "/api/checkin"
API_KEY = os.environ["RFID_API_KEY"]

GREEN_PIN = 17
RED_PIN   = 27
BUZZ_PIN  = 22
COOLDOWN  = 2  # seconds between reads

GPIO.setmode(GPIO.BCM)
GPIO.setup(GREEN_PIN, GPIO.OUT, initial=GPIO.LOW)
GPIO.setup(RED_PIN,   GPIO.OUT, initial=GPIO.LOW)
GPIO.setup(BUZZ_PIN,  GPIO.OUT, initial=GPIO.LOW)


def _led(pin: int, duration: float) -> None:
    GPIO.output(pin, GPIO.HIGH)
    time.sleep(duration)
    GPIO.output(pin, GPIO.LOW)


def _beep(count: int, on: float = 0.12, gap: float = 0.10) -> None:
    for i in range(count):
        GPIO.output(BUZZ_PIN, GPIO.HIGH)
        time.sleep(on)
        GPIO.output(BUZZ_PIN, GPIO.LOW)
        if i < count - 1:
            time.sleep(gap)


def signal_success() -> None:
    _led(GREEN_PIN, 1.5)
    _beep(1)


def signal_failure() -> None:
    _led(RED_PIN, 1.5)
    _beep(2)


def signal_no_network() -> None:
    for _ in range(3):
        GPIO.output(RED_PIN,  GPIO.HIGH)
        GPIO.output(BUZZ_PIN, GPIO.HIGH)
        time.sleep(0.4)
        GPIO.output(RED_PIN,  GPIO.LOW)
        GPIO.output(BUZZ_PIN, GPIO.LOW)
        time.sleep(0.15)


def checkin(hex_uid: str) -> bool | None:
    """POST to MatConnect. Returns True=success, False=known failure, None=network error."""
    try:
        r = requests.post(
            URL,
            json={"rfidToken": hex_uid},
            headers={"X-RFID-Key": API_KEY, "Content-Type": "application/json"},
            timeout=5,
        )
        return r.status_code == 200 and r.json().get("success") is True
    except (requests.exceptions.RequestException, ValueError):
        return None


def cleanup(sig=None, _frame=None) -> None:
    GPIO.cleanup()
    sys.exit(0)


signal.signal(signal.SIGTERM, cleanup)
signal.signal(signal.SIGINT, cleanup)

reader = mfrc522.MFRC522()
print("MatConnect NFC reader running. Ctrl+C to stop.")

while True:
    status, _tag_type = reader.MFRC522_Request(reader.PICC_REQIDL)
    if status != reader.MI_OK:
        continue

    status, uid = reader.MFRC522_Anticoll()
    if status != reader.MI_OK:
        continue

    hex_uid = "".join(f"{b:02X}" for b in uid)
    print(f"Tag: {hex_uid}")

    result = checkin(hex_uid)
    if result is None:
        time.sleep(3)
        result = checkin(hex_uid)  # one retry

    if result is None:
        signal_no_network()
    elif result:
        signal_success()
    else:
        signal_failure()

    time.sleep(COOLDOWN)
