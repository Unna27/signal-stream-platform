from kafka import KafkaProducer
import json
import random
import time
import sys
import argparse
import uuid

KAFKA_SERVER = "localhost:9092"
TOPIC = "raw-signals"

DEFAULT_INTERVAL = 10       # seconds between signals
DEFAULT_COUNT = 20

BASE_MIN = 40
BASE_MAX = 60

def create_producer_with_retry(max_retries=5, timeout=10):

    for attempt in range(max_retries):

        try:
            print(
                f"Attempting to connect to Kafka "
                f"(attempt {attempt + 1}/{max_retries})..."
            )

            producer = KafkaProducer(
                bootstrap_servers=KAFKA_SERVER,
                key_serializer=lambda key: key.encode('utf-8'),
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                request_timeout_ms=timeout * 1000,
                retries=3
            )

            print("✓ Successfully connected to Kafka!")
            return producer

        except Exception as e:

            print(f"✗ Connection failed: {e}")

            if attempt < max_retries - 1:
                wait_time = 2 ** attempt

                print(f"  Retrying in {wait_time} seconds...")
                time.sleep(wait_time)

            else:
                print("✗ Failed to connect after all retries")
                return None


# Signal Generators

def generate_normal_signal(base_value=50):
    """
    Normal signal:
    Small random variation around the base value.
    """

    return random.randint(base_value - 5, base_value + 5)


def generate_spike_signal(base_value=50):
    """
    Spike signal:
    Occasionally produces a very high value.
    """

    if random.random() < 0.2:
        # 20% chance of spike
        return random.randint(90, 120)

    return random.randint(base_value - 5, base_value + 5)


def generate_drop_signal(base_value=50):
    """
    Drop signal:
    Occasionally produces a very low value.
    """

    if random.random() < 0.2:
        # 20% chance of drop
        return random.randint(0, 10)

    return random.randint(base_value - 5, base_value + 5)


def generate_flat_signal(base_value=50):
    """
    Flat signal:
    Always produces approximately the same value.
    """

    return base_value

# Pattern Selection

PATTERNS = {
    "normal": generate_normal_signal,
    "spike": generate_spike_signal,
    "drop": generate_drop_signal,
    "flat": generate_flat_signal,
}


def generate_value(pattern, base_value=50):

    generator = PATTERNS.get(pattern)

    if generator is None:
        raise ValueError(f"Unknown pattern: {pattern}")

    return generator(base_value)

# Signal Creation

def create_signal(device_id, pattern):
#   Create a signal dictionary with the specified device ID and pattern. There is a 20% chance of generating a spike or drop signal, depending on the pattern.
    value = generate_value(pattern)

    return {
        "id": str(uuid.uuid4()),
        "deviceId": device_id,
        "value": value,
        "timestamp": int(time.time() * 1000),
        "pattern": pattern
    }


def parse_devices(device_specs, default_device_id, default_pattern):
    """Resolve repeated DEVICE_ID[:PATTERN] options into device/pattern pairs."""
    if not device_specs:
        return [(default_device_id or "device-001", default_pattern)]

    if default_device_id is not None:
        raise ValueError("--device cannot be combined with --device-id")

    devices = []
    seen_device_ids = set()

    for specification in device_specs:
        device_id, separator, pattern = specification.partition(":")
        device_id = device_id.strip()
        pattern = pattern.strip() if separator else default_pattern

        if not device_id:
            raise ValueError("Device ID cannot be empty")
        if not pattern:
            raise ValueError(f"Pattern cannot be empty for device {device_id}")
        if pattern not in PATTERNS:
            raise ValueError(
                f"Unknown pattern for device {device_id}: {pattern}. "
                f"Choose from: {', '.join(PATTERNS)}"
            )
        if device_id in seen_device_ids:
            raise ValueError(f"Device ID specified more than once: {device_id}")

        seen_device_ids.add(device_id)
        devices.append((device_id, pattern))

    return devices


# Main Producer

def main():

    parser = argparse.ArgumentParser(
        description="Kafka Signal Generator"
    )

    parser.add_argument(
        "--pattern",
        choices=["normal", "spike", "drop", "flat"],
        default="normal",
        help="Default pattern (also used for --device entries without a pattern)"
    )

    parser.add_argument(
        "--device-id",
        help="Device ID for single-device mode (default: device-001)"
    )

    parser.add_argument(
        "--device",
        action="append",
        dest="devices",
        metavar="DEVICE_ID[:PATTERN]",
        help=(
            "Device to generate for; may be repeated. Optionally specify a "
            "pattern per device, e.g. --device device-001:normal"
        )
    )

    parser.add_argument(
        "--count",
        type=int,
        default=10,
        help="Number of signals to generate"
    )

    parser.add_argument(
        "--interval",
        type=int,
        default=60,
        help="Interval between signals in seconds"
    )

    args = parser.parse_args()

    try:
        devices = parse_devices(args.devices, args.device_id, args.pattern)
    except ValueError as error:
        parser.error(str(error))

    print("\n--------------------------------")
    print("Kafka Signal Generator")
    print("--------------------------------")
    print(f"Devices: {', '.join(f'{device_id} ({pattern})' for device_id, pattern in devices)}")
    print(f"Rounds : {args.count} (signals per device)")
    print(f"Interval: {args.interval}s")
    print("--------------------------------\n")

    producer = create_producer_with_retry()

    if producer is None:

        print(
            f"ERROR: Could not connect to Kafka broker "
            f"at {KAFKA_SERVER}"
        )

        sys.exit(1)

    try:

        for i in range(args.count):
            for device_id, pattern in devices:
                signal = create_signal(device_id=device_id, pattern=pattern)
                record_metadata = producer.send(TOPIC, key = signal['deviceId'], value = signal).get(timeout=10) # key is added to keep all signals per device in the same partition

                print(
                    f"[{i + 1}/{args.count}] "
                    f"signal={signal['id']} "
                    f"device={signal['deviceId']} "
                    f"value={signal['value']} "
                    f"pattern={signal['pattern']} "
                    f"partition={record_metadata.partition} "
                    f"offset={record_metadata.offset}"
                )

            if i < args.count - 1:
                time.sleep(args.interval)

    except KeyboardInterrupt:

        print("\nProducer stopped by user.")

    except Exception as e:
        import traceback
        print(f"✗ Failed to send message: {e}")
        traceback.print_exc()
        raise
    finally:

        print("Closing Kafka producer...")

        producer.close(timeout=10)

        print("✓ Producer closed successfully")


if __name__ == "__main__":
    main()
