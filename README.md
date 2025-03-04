


# **❤️ Love That Gives Back**

- [Concept Overview](#concept-overview)
- [Front-End Features](#front-end-features)
  - [Home Page (Landing Page)](#1-home-page-landing-page)
  - [User Authentication](#2-user-authentication)
  - [Dashboard](#3-dashboard)
  - [Charity Pages (CRUD Features)](#4-charity-pages-crud-features)
  - [Responsive Design](#5-responsive-design)
  - [API Integration](#6-api-integration)
- [Back-End Features](#back-end-features)
  - [Django Server](#1-django-server)
  - [Database](#2-database)
  - [User Authentication & Authorization](#3-user-authentication--authorization)
  - [Donation Management](#4-donation-management)
  - [Automated Testing](#5-automated-testing)
- [Tools & Technologies](#tools--technologies)
  - [Front-End](#front-end)
  - [Back-End](#back-end)
  - [Version Control & Deployment](#version-control--deployment)
- [ER Diagram](#er-diagram)
- [Sitemap](#sitemap)
- [User Flow](#user-flow)
- [User Stories](#user-stories)
  - [Guest User (Wedding Guest)](#guest-user-wedding-guest)
  - [Wedding Couple (Profile Owner)](#wedding-couple-profile-owner)
  - [Admin (Superuser)](#admin)

---

## **Concept Overview**  
**Theme:** A platform where users can explore and donate to various charity organizations tied to a couple's values.  
**Objective:**  
- Celebrate love by inspiring generosity.  
- Provide a seamless user experience for exploring charities and donating.  

---

Here’s your **README** updated to replace Django templates with **React** for the front-end:

---

## **Front-End Features**  

### 1. **Home Page (Landing Page)**  
- A **hero section** introducing the mission.  
- Buttons/Links for **logging in, exploring charities, and donating**.  
- Display the **wedding date** with a **countdown timer** using React state/hooks.  
- Highlight charity statistics (e.g., **total donations**) with real-time updates.  

### 2. **User Authentication**  
- **Registration & Login:**  
  - Collect user details (Name, email, password) via **React Forms** (controlled components).  
  - Send authentication requests to a **Django REST API** (Auth tokens).  
  - Store user session data in **local storage or React Context API**.  
- **Logout:**  
  - Clear session tokens and update UI accordingly.  

### 3. **Dashboard**  
- Display **personalized greetings** using React state and props.  
- Show donation history fetched from the **Django API** via **Axios**.  
- Allow users to **set and track donation goals**, using React components and state management (e.g., Context API, Redux if needed).  

### 4. **Charity Pages (CRUD Features)**  
- Display a **list of charities** using React components and dynamic routing (`react-router-dom`).  
- Each charity has a **detailed page** with images, descriptions, and fundraising goals.  
- **Admin users** can create, update, and delete charities using API requests to Django’s backend.  
- Optionally, enable **comments or "likes"** using React state and backend API calls for engagement.

### 5. **Responsive Design**  
- Utilize **Bootstrap** for modern, responsive UI components.  
- Ensure mobile-friendly design with **flexbox, grid layouts, and media queries**.  

---

### 6. **API Integration**  
- **External API:** Integrate with external payment processors (Stripe) via Django views to display live donation progress and handle secure payments.

---

## **Back-End Features**  

### 1. **Django Server**  
- Develop a RESTful API using Django Rest Framework for any necessary data interchange.  
- Serve dynamic HTML pages rendered through Django’s templating engine.

### 2. **Database**  
- Use PostgreSQL for scalable and reliable data management.  
- Store user profiles, charity data, and donation transactions securely.

### 3. **User Authentication & Authorization**  
- Secure user login with hashed passwords using Django's robust authentication system.  
- Manage user roles (admin, authenticated user, guest) via Django’s permission framework.

### 4. **Donation Management**  
- Implement CRUD functionality for managing donations through Django views and forms.  
- Generate donation receipts and send confirmation emails using Django’s email utilities.

### 5. **Automated Testing**  
- Utilize Django’s `unittest` framework to rigorously test views, forms, and API endpoints.

---

## **Tools & Technologies**  

### **Front-End:**  
- React

### **Back-End:**  
- Django with Django Rest Framework for API development.  
- PostgreSQL for database management.

### **Version Control & Deployment:**  
- Git for version control.  
- Deploy the full-stack Django application on platforms like Render or Heroku.

---

## ER Diagram

```mermaid
erDiagram
    USER {
      int id PK
      string username
      string email
    }
    PROFILE {
      int id PK
      date wedding_date
      string bio
      string location
      string profile_picture
      string bank
      string account_number
      string bank_identifier
    }
    CHARITY {
      int id PK
      string name
      string description
      string website
      string logo
    }
    DONATION {
      int id PK
      string donor_name
      string donor_email
      decimal amount
      string message
      string status "pending/confirmed/failed"
      datetime created_at
      datetime updated_at
      string stripe_payment_id "optional"
    }
    
    USER ||--|| PROFILE : "has"
    PROFILE }o--o{ CHARITY : "supports"
    CHARITY ||--o{ DONATION : "receives"
```

---

## Sitemap

```mermaid
mindmap
  root((Love That Gives Back))
      About / How It Works (About Us)
      Login Page (Login/Logout)
      Home Page (Home)
        Select Cause (Charities)
          Donation Form Page (Donate)
            Payment Instructions Page
           Donation Confirmation Page
      Couple Dashboard (Dashboard)
        Couple's Profile (Settings)
          Edit Profile
          Manage Supported Charities (Charities)
            Add New Charity
            View Supported Charities
              Edit Selected Charities
        View Donations (Donations)
          List of Confirmed Donations
          Donation Details Page
      Admin Dashboard (Admin Panel)
        Manage Donations
          (Confirm / Fail)
        View Overall Donation Statistics (Analytics/Reports)
          Charts
          Export
        Manage Users
        Manage Charities
```

---

## User Flow

```mermaid
flowchart TD
    A[Visit Home Page] --> B{User Type?}
    B -- Guest --> C[Select Couple Profile]
    C --> D[Choose Supported Charity]
    D --> E[Fill Out Donation Form]
    E --> F[Review Payment Instructions]
    F --> G[Donation Confirmation]
    
    B -- Couple --> H[Register / Login]
    H --> I[Manage Profile]
    I --> J[Edit Profile Details]
    J --> K[(Wedding Date, Bio, Location)]
    I --> L[Manage Supported Charities]
    L --> M[Add New Charity]
    M --> N[(Name, Description, Website)]
    L --> O[View/Update Selected Charities]
    I --> P[View Donations]
    P --> Q[List of Confirmed Donations]
    Q --> R[Donation Details]
    
    B -- Admin --> S[Admin Login]
    S --> T[Admin Dashboard]
    T --> U[Manage Donations]
    T --> V[View Statistics & Analytics]
    V --> W[(Percentage Charts, Donation Trends)]
    T --> X[Manage Users & Charities]
```

---

## User Stories

### Guest User (Wedding Guest)
- As a guest, I want to view a couple’s profile and supported charities so that I can select one to donate to.
- As a guest, I want to fill out a donation form with my name, email, donation amount, and a personal message so that I can contribute a gift.
- As a guest, I want to review payment instructions and receive confirmation after submitting my donation so that I know my gift is acknowledged.

### Wedding Couple (Profile Owner)
- As a couple, I want to register and log in with a single user account so that I can manage my profile easily.
- As a couple, I want to view my profile details (wedding date, bio, location, etc.) so that guests know more about us.
- As a couple, I want to edit my profile details and update my supported charities so that I can choose which charities are displayed on my profile.
- As a couple, I want to see a list of confirmed donations (filtered by the charities I support) so that I can track the contributions and share my gratitude.

### Admin (Superusers)
- As an admin, I want to log in and view an admin dashboard so that I can manage all donations and user data.
- As an admin, I want to update the status of donations (mark them as confirmed or failed) so that the system reflects the correct payment status.
- As an admin, I want to view overall statistics and analytics (e.g., donation trends, percentages, reports) so that I can monitor platform performance.
- As an admin, I want to manage users and charities so that I can ensure data integrity and handle disputes if necessary.

---

