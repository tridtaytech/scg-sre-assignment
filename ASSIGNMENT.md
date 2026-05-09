# 🚀 DevOps Take-Home Assignment (7-Day Challenge)

Welcome to the 7-day DevOps assignment. Your mission is to design, build, and manage a production-grade microservice deployment using modern DevOps practices and tools.

---

## 🧩 1. Setup & Plan

### ✅ Deliverables
- Project plan with architecture diagram and tech stack
- GitHub repository with this `README.md`

### 🛠️ Tasks
- Deploy 2 services (1 backend, 1 frontend)
- Define infrastructure (e.g., AWS, GCP, Azure)
- Choose your toolchain (e.g., Terraform, Docker, Kubernetes, GitHub Actions, Prometheus, etc.)
- Sketch out the architecture for:
  - Application
  - CI/CD pipeline
  - Monitoring/Logging

---

## 🏗️ 2. Infrastructure as Code

### ✅ Deliverables
- Terraform or Pulumi code to provision:
  - Kubernetes cluster or Docker Swarm
  - VPC, subnet, Load Balancer, storage, etc.

### 🎁 Bonus
- Use remote backend for state management
- Structure IaC using modules

---

## 📦 3. Application Containerization

### ✅ Deliverables
- Dockerized microservice (Node.js, Python, or Go)
- Image pushed to a container registry (Docker Hub, ECR, etc.)

### ⚙️ Requirements
- Use multi-stage Docker builds
- Optimize image size
- Define container health checks

---

## 🔁 4. CI/CD Pipeline

### ✅ Deliverables
- Set up CI/CD using GitHub Actions, GitLab CI, or Jenkins
- Pipeline should:
  - Build, test, and push the image
  - Deploy to a staging or production environment

### 🎁 Bonus
- Implement a deployment strategy (e.g., blue-green or canary)

---

## ☸️ 5. Kubernetes Deployment

### ✅ Deliverables
- Kubernetes manifests or a Helm chart for:
  - Deployment
  - Service
  - Ingress (with TLS if possible)

### 🎁 Bonus
- Use ConfigMaps and Secrets for configuration

---

## 📈 6. Observability

### ✅ Deliverables
- Logging and monitoring setup:
  - Prometheus + Grafana for metrics
  - Fluent Bit or Loki for logs

### 🎁 Bonus
- Configure alerting (e.g., pod crashes, high CPU/memory)

---

## 📝 7. Documentation & Demo

### ✅ Deliverables
- Final `README.md` with:
  - How to deploy the project
  - Architecture and CI/CD diagrams
  - Monitoring and logging setup

---

## 📊 Evaluation Criteria

| Area             | Focus                                                                 |
|------------------|-----------------------------------------------------------------------|
| IaC              | Reusability, modular design, cloud-agnostic setup                    |
| Dockerization    | Build efficiency, small image size, production readiness             |
| CI/CD            | Reliability, rollback capability, environment separation             |
| Kubernetes       | Best practices, scaling, configuration separation                    |
| Monitoring       | Useful dashboards, alert coverage, performance visibility            |
| Documentation    | Clarity, completeness, structure, and ease of understanding          |

---

Good luck, and have fun! 💪