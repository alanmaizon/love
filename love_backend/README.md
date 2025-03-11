# **Love Backend**

This is the **Django backend** for **Love That Gives Back**, a wedding gift platform that allows guests to contribute to **charities** sending money **directly to the couple**.

---

## **🚀 Features**
- **User Authentication & Profiles**  
  - Login/Logout with **session-based authentication**.  
  - Profile management for couples (name, wedding date, payment details).  

- **Donation System**  
  - **Guest & registered user donations** (via Revolut or manual transfer).  
  - Donation **confirmation page with payment instructions**.  
  - **Admin approval system** to verify payments.  

- **Charity Management (Admin)**  
  - **CRUD operations** (add, update, delete charities).  
  - Cloudinary integration for **logo uploads**.  
  - Public list of charities for donors.  

- **Admin & User Dashboards**  
  - **Admin Dashboard** → Track donations, approve/reject transactions, view analytics.  
  - **User Dashboard** → Couples can view received gifts, read messages, and manage their profile.

---

## **🛠️ Tech Stack**
- **Django & Django REST Framework (DRF)** - Backend API & authentication.  
- **PostgreSQL** - Database management.  
- **Cloudinary** - Image storage for profiles & charities.  
- **Bootstrap** - Frontend UI components (for admin panel).  
- **Revolut Checkout Links** - Payment processing.

---

## **📌 API Endpoints**

### **Authentication**
| Method | Endpoint                | Description                   |
|--------|-------------------------|-------------------------------|
| `POST` | `/api/auth/login/`      | User login                    |
| `POST` | `/api/auth/logout/`     | User logout                   |
| `GET`  | `/api/auth/user/`       | Get current user info         |

### **Donations**
| Method   | Endpoint                           | Description                                      |
|----------|------------------------------------|--------------------------------------------------|
| `POST`   | `/api/donations/`                  | Create a new donation                            |
| `GET`    | `/api/donations/{id}/`             | View donation details                            |
| `GET`    | `/api/donations/`                  | List all donations                               |
| `PATCH`  | `/api/donations/{id}/confirm/`     | Confirm a donation (admin only)                  |
| `PATCH`  | `/api/donations/{id}/fail/`        | Mark a donation as failed (admin only)           |

### **Charities**
| Method   | Endpoint                           | Description                                      |
|----------|------------------------------------|--------------------------------------------------|
| `GET`    | `/api/charities/`                  | List all charities                               |
| `POST`   | `/api/charities/`                  | Add a new charity (admin only)                   |
| `PATCH`  | `/api/charities/{id}/`             | Update charity (admin only)                      |
| `DELETE` | `/api/charities/{id}/`             | Delete charity (admin only)                      |

### **Admin**
| Method | Endpoint           | Description                                               |
|--------|--------------------|-----------------------------------------------------------|
| `GET`  | `/api/analytics/`  | Retrieve donation analytics (admin only)                  |
| `GET`  | `/api/charts/`     | Retrieve combined donation charts (admin only)            |

> **Note:** All endpoints marked as "(admin only)" require administrative privileges. Unauthorized requests will be rejected.

---

## **🔧 Setup & Installation**
### **1️⃣ Clone the Repository**
```sh
git clone https://github.com/alanmaizon/love/love_backend.git
cd love_backend
```

### **2️⃣ Create a Virtual Environment**
```sh
python -m venv venv
source venv/bin/activate   # macOS/Linux
venv\Scripts\activate      # Windows
```

### **3️⃣ Install Dependencies**
```sh
pip install -r requirements.txt
```

### **4️⃣ Configure `.env` File**
Create a `.env` file in the root directory, you will need:
```
SECRET_KEY
DEBUG=True
ALLOWED_HOSTS
DATABASE_URL
REVOLUT_CHECKOUT_URL
```

### **5️⃣ Apply Database Migrations**
```sh
python manage.py migrate
```

### **6️⃣ Create a Superuser**
```sh
python manage.py createsuperuser
```
Follow the prompts to set up your admin credentials.

### **7️⃣ Run the Development Server**
```sh
python manage.py runserver
```
Access the API at `http://127.0.0.1:8000/api/`

---

## **🛠 Testing**
Run unit tests using:
```sh
python manage.py test
```

---

## **🚀 Deployment**
For production, use **Gunicorn & Nginx** with **PostgreSQL**.
```sh
pip install gunicorn
gunicorn love_backend.wsgi:application --bind 0.0.0.0:8000
```
For **Render**, configure `DATABASE_URL` in `.env`.
```

