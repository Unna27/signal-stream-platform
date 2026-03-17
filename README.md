# 🚀 Real-Time Signal Processing Platform

A scalable, event-driven microservices platform that simulates real-time signal ingestion, processing, storage, and live visualization using modern distributed system design patterns.

---

## 📌 Overview

This project demonstrates how to build a real-time data pipeline using **event streaming architecture**. Signals are continuously produced, processed asynchronously, stored in a database, and streamed live to a frontend dashboard without page refresh.

The system is designed with **loose coupling, scalability, and fault tolerance** in mind.

---

## 🏗️ Architecture

```
Python Producer
      ↓
Kafka (raw-signals)
      ↓
Signal Processor (NestJS)
      ↓
Kafka (processed-signals)
      ↓
Storage Service (NestJS)
      ↓
PostgreSQL
      ↓
API Gateway (NestJS)
   ├── REST API (historical data)
   └── WebSocket (live stream)
      ↓
Angular Dashboard
```

---

## ⚙️ Tech Stack

### Backend

- **Node.js** (NestJS microservices)
- **NestJS**
- **Apache Kafka** (event streaming)
- **KafkaJS**
- **PostgreSQL**

### Producer

- Python (signal simulation)
- **kafka-python**

### Frontend

- **Angular**
- **Socket.IO**
- **Chart.js**

### DevOps / Tools

- **Docker**
- Kafka UI (topic inspection & debugging)

---

## 🔄 Key Features

- ⚡ Real-time event streaming using Kafka
- 🔁 Asynchronous microservices communication
- 📡 Live dashboard updates via WebSockets
- 📊 Historical + real-time data visualization
- 📦 Scalable consumer groups with parallel processing
- 🛑 Dead Letter Queue (DLQ) for failed message handling
- 🐳 Fully containerized local development setup

---

## 🧠 Core Concepts Implemented

- Event-driven architecture
- Microservices with message queues
- Kafka topics, partitions, and consumer groups
- Offset management and replay capability
- Fault tolerance with retry & DLQ pattern
- Real-time UI streaming

---

## ▶️ Getting Started

### 1. Start infrastructure

```bash
docker-compose up -d
```

This starts:

- Kafka + Zookeeper
- PostgreSQL

---

### 2. Start backend services

```bash
npm run start:signal-processor
npm run start:storage-service
npm run start:api-gateway
```

---

### 3. Start Python producer

```bash
cd producer-python
source venv/bin/activate   # or venv\Scripts\activate (Windows)
python producer.py
```

---

### 4. Start Angular dashboard

```bash
cd signal-dashboard
ng serve
```

Open:

```
http://localhost:4200
```

---

## 📡 Data Flow

1. Producer generates signal events every few seconds
2. Events are published to Kafka (`raw-signals`)
3. Signal processor enriches and forwards events
4. Storage service persists data into PostgreSQL
5. API Gateway:
   - Serves historical data via REST
   - Streams live updates via WebSocket

6. Angular dashboard updates in real time

---

## 🛠️ Future Improvements

- 📊 Advanced analytics service (aggregations, trends)
- ☸️ Kubernetes deployment
- 🔐 Authentication & authorization

---

## 📸 Demo

![Signal Dashboard Image](/assets/SignalStreamDashboard.png 'Signal Dashboard Image')

---

## 💡 Why this project?

This project showcases real-world backend engineering skills:

- Designing scalable distributed systems
- Building event-driven microservices
- Handling real-time data streams
- Integrating backend with live frontend dashboards

---

## 📬 Contact

Feel free to connect if you'd like to discuss system design, Kafka, or backend architecture.
