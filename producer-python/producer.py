from kafka import KafkaProducer
from kafka.errors import KafkaError
import json
import random
import time
import sys

def create_producer_with_retry(max_retries=5, timeout=10):
    """Create Kafka producer with retry logic"""
    for attempt in range(max_retries):
        try:
            print(f"Attempting to connect to Kafka (attempt {attempt + 1}/{max_retries})...")
            producer = KafkaProducer(
                bootstrap_servers="localhost:9092",
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

# Create producer with retry logic
producer = create_producer_with_retry()

if producer is None:
    print("ERROR: Could not connect to Kafka broker at localhost:9092")
    print("Make sure Kafka is running: docker-compose ps")
    sys.exit(1)

""" try:
    # Test sending a single message
    signal = {
        "id": str(random.randint(50, 150)),
        "value": random.randint(1, 20),
        "timestamp": int(time.time() * 1000)  # Returns: 1710518400123
    }
    
    future = producer.send("raw-signals", signal)
    record_metadata = future.get(timeout=10)
    print(f"✓ Message sent: {signal}")
    print(f"  Topic: {record_metadata.topic}, Partition: {record_metadata.partition}, Offset: {record_metadata.offset}")
    
except Exception as e:
    print(f"✗ Failed to send message: {e}")

finally:
    # Properly close the producer
    print("Closing Kafka producer...")
    producer.close(timeout=10)
    print("✓ Producer closed successfully") """

try:
    # Test sending multiple messages
    for i in range(10):
        signal = {
            "id": str(random.randint(50, 150)),
            "value": random.randint(1, 20),
            "timestamp": int(time.time() * 1000)  # Returns: 1710518400123
        }
        
        future = producer.send("raw-signals", signal)
        record_metadata = future.get(timeout=10)
        print(f"✓ Message sent: {signal}")
        print(f"  Topic: {record_metadata.topic}, Partition: {record_metadata.partition}, Offset: {record_metadata.offset}")
        
        # Wait 30 seconds before sending next message
        time.sleep(60)
    
except Exception as e:
    print(f"✗ Failed to send message: {e}")

finally:
    # Properly close the producer
    print("Closing Kafka producer...")
    producer.close(timeout=10)
    print("✓ Producer closed successfully")