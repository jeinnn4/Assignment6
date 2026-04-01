# DevOps API – CI/CD Pipeline Project

A Node.js + MongoDB REST API with a full CI/CD pipeline using Jenkins, SonarQube, Docker, and Trivy.

## Tech Stack
- **Runtime:** Node.js 18 + Express
- **Database:** MongoDB (via Mongoose)
- **Auth:** JWT
- **CI/CD:** Jenkins (Declarative Pipeline)
- **Code Quality:** SonarQube
- **Container:** Docker
- **Security Scan:** Trivy

## API Endpoints

### Health
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Health check |

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user, returns JWT |
| GET | `/api/auth/me` | Get current user (protected) |

### Products
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/products` | Get all products |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products` | Create product (protected) |
| PUT | `/api/products/:id` | Update product (protected) |
| DELETE | `/api/products/:id` | Delete product (protected) |

### Users (Admin only)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users` | Get all users |
| GET | `/api/users/:id` | Get single user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

## Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/devops-api.git
cd devops-api

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env — add your MONGO_URI

# 4. Start the server
npm run dev
```

## Docker

```bash
# Build image
docker build -t devops-api .

# Run container
docker run -d -p 5000:5000 \
  -e MONGO_URI="your-mongo-uri" \
  -e JWT_SECRET="your-secret" \
  devops-api
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default 5000) | No |
| `MONGO_URI` | MongoDB connection string | **Yes** |
| `JWT_SECRET` | Secret key for JWT signing | **Yes** |
| `JWT_EXPIRE` | JWT expiry (default 30d) | No |
| `NODE_ENV` | Environment (development/production) | No |

## Pipeline Stages
1. Checkout
2. Install Dependencies
3. Run Tests
4. SonarQube Analysis
5. Quality Gate
6. Trivy FS Scan
7. Build Docker Image
8. Trivy Image Scan
9. Push to Docker Hub
10. Deploy Container on EC2
