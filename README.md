# 蓝鲸CRM

A comprehensive Customer Relationship Management system built with Flask (backend) and React (frontend).

## Project Structure

```
crm_system/
├── backend/
│   ├── app.py                 # Main Flask application
│   ├── config.py              # Configuration settings
│   ├── models/
│   │   └── __init__.py        # Database models
│   ├── routes/
│   │   ├── auth.py            # Authentication routes
│   │   ├── users.py           # User management routes
│   │   ├── customers.py       # Customer management routes
│   │   ├── sales.py           # Sales management routes
│   │   ├── marketing.py       # Marketing management routes
│   │   └── reports.py         # Reporting routes
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables
├── frontend/
│   ├── package.json           # Node.js dependencies
│   ├── src/
│   │   ├── main.tsx           # Main entry point
│   │   ├── App.tsx            # Main application component
│   │   ├── services/
│   │   │   └── api.ts         # API service
│   │   ├── contexts/
│   │   │   └── AuthContext.ts # Authentication context
│   │   ├── pages/
│   │   │   ├── Login.tsx      # Login page
│   │   │   ├── Register.tsx   # Registration page
│   │   │   └── Dashboard.tsx  # Dashboard page
│   │   └── components/        # Reusable components
│   ├── tsconfig.json          # TypeScript configuration
│   ├── tsconfig.node.json     # TypeScript node configuration
│   └── vite.config.ts         # Vite configuration
├── .env                       # Environment variables
├── init_db.py                 # Database initialization script
└── README.md                  # This file
```

## Features

### User Management
- User authentication and authorization
- Role-based access control (Admin, Sales, Customer Service, Marketing)
- User profile management

### Customer Management
- Centralized customer data
- Contact history tracking
- Customer classification and segmentation
- Lifecycle management

### Sales Management
- Lead-to-order tracking
- Sales pipeline visualization
- Activity scheduling and reminders
- Document management

### Marketing Management
- Lead management and assignment
- Marketing automation
- Campaign tracking

### Reporting & Analytics
- Sales and activity reporting
- KPI dashboards
- Export capabilities

### System Integration
- Email integration
- Calendar integration
- API endpoints for third-party tools

## Getting Started

### Quick Start

Start both services from the project root:

```bash
cd /Users/samxuan/sam/code/crm_system
./start.sh
```

Check whether they are running:

```bash
./status.sh
```

Stop both services:

```bash
./stop.sh
```

Logs are written to `crm_system/logs/backend.log` and `crm_system/logs/frontend.log`.

### Prerequisites

Make sure you have the following installed:
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd /Users/samxuan/sam/code/crm_system/backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
```bash
# On macOS/Linux
source venv/bin/activate
# On Windows
venv\Scripts\activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Set up environment variables by copying the .env file:
```bash
cp ../.env .env
# Edit the .env file with your specific configuration
```

6. Initialize the database:
```bash
python ../simple_init_db.py
```

7. Run the application:
```bash
python app.py
```

The backend will be available at `http://172.16.1.32:5006`.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd /Users/samxuan/sam/code/crm_system/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://172.16.1.32:3000`.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get a specific user (admin only)
- `PUT /api/users/:id` - Update a user (admin only)
- `DELETE /api/users/:id` - Delete a user (admin only)

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create a new customer
- `GET /api/customers/:id` - Get a specific customer
- `PUT /api/customers/:id` - Update a customer
- `DELETE /api/customers/:id` - Delete a customer
- `GET /api/customers/:id/interactions` - Get customer interactions
- `POST /api/customers/:id/interactions` - Add customer interaction

### Sales
- `GET /api/sales/opportunities` - Get all opportunities
- `POST /api/sales/opportunities` - Create a new opportunity
- `GET /api/sales/opportunities/:id` - Get a specific opportunity
- `PUT /api/sales/opportunities/:id` - Update an opportunity
- `DELETE /api/sales/opportunities/:id` - Delete an opportunity
- `GET /api/sales/orders` - Get all orders
- `POST /api/sales/orders` - Create a new order
- `GET /api/sales/orders/:id` - Get a specific order
- `PUT /api/sales/orders/:id` - Update an order
- `GET /api/sales/pipeline` - Get sales pipeline data

### Marketing
- `GET /api/marketing/campaigns` - Get all campaigns
- `POST /api/marketing/campaigns` - Create a new campaign
- `GET /api/marketing/campaigns/:id` - Get a specific campaign
- `PUT /api/marketing/campaigns/:id` - Update a campaign
- `DELETE /api/marketing/campaigns/:id` - Delete a campaign
- `GET /api/marketing/leads` - Get all leads
- `POST /api/marketing/leads` - Create a new lead
- `PUT /api/marketing/leads/:id` - Update a lead

### Reports
- `GET /api/reports/dashboard` - Get dashboard metrics
- `GET /api/reports/sales` - Get sales report
- `GET /api/reports/activity` - Get activity report
- `GET /api/reports/export` - Export data

## Technologies Used

- **Backend**: Flask, SQLAlchemy, JWT for authentication, python-dotenv
- **Frontend**: React, TypeScript, Chakra UI, React Router, Axios
- **Database**: SQLite (default), can be configured to use PostgreSQL/MySQL
- **Build Tools**: Vite for frontend, pip for backend

## Security Features

- JWT-based authentication
- Role-based access control
- Password hashing with Werkzeug
- Input validation
- SQL injection prevention through ORM
- Environment variable management

## Environment Variables

The application uses a `.env` file to manage configuration. Key variables include:

- `DATABASE_URL`: Database connection string
- `SECRET_KEY`: Secret key for session signing
- `JWT_SECRET_KEY`: Secret key for JWT tokens
- `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`: Email settings

## Performance & Scalability

- Optimized database queries
- Pagination for large datasets
- Efficient API design
- Modular architecture for easy scaling

## Troubleshooting

### Common Issues

1. **Port already in use**: If you encounter "Address already in use" errors, check for existing processes:
   ```bash
   lsof -i :5006  # Check what's using port 5006
   kill -9 <PID>  # Kill the process with the given PID
   ```

2. **Database connection errors**: Ensure the database file has proper permissions and exists.

3. **Environment variables not loading**: Make sure the `.env` file is in the correct location and properly formatted.

4. **Frontend can't connect to backend**: Verify that the proxy settings in `vite.config.ts` point to the correct backend port.

### Default Credentials

After initialization, the system creates a default admin user:
- Username: `admin`
- Password: `admin123`
- Email: `admin@example.com`

⚠️ **Important**: Change the default password immediately after first login.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request
