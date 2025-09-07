# 🩺 Doctor-Patient Blog System

## 📌 Project Description
This project is a **blog system** integrated into a healthcare application.  
- **Doctors** can upload new blog posts with categories like *Mental Health, Heart Disease, Covid19, Immunization*.  
- **Patients** can browse and read published blogs category-wise.  
- Doctors can also save posts as **drafts**, which are visible only to them.  

---

## ✨ Features
### 👨‍⚕️ Doctor Features
- Create a new blog post with fields:
  - Title
  - Image
  - Category (Mental Health, Heart Disease, Covid19, Immunization)
  - Summary
  - Content
- Option to mark a post as **Draft**.
- View all posts created by the logged-in doctor.

### 🧑‍🤝‍🧑 Patient Features
- View all **published** (non-draft) blog posts.
- Posts are grouped **category-wise**.
- Each blog card contains:
  - Title
  - Image
  - Summary (truncated to 15 words with `...` if longer).

---

## ⚙️ Technical Requirements
- **Frontend**: Any JavaScript framework/library (React.js, Vue.js, Angular, or plain JS).
- **Backend**: Node.js / Express (or any preferred backend tech).
- **Database**: MySQL.
- **ORM/Database Access**: Sequelize / Knex.js / raw SQL queries.
- **Authentication**: Doctors and Patients are separate user roles.

---

## 🗄️ Database Schema (Suggested)
### `users`
| id | name  | email | password | role (`doctor`/`patient`) |
|----|-------|-------|----------|----------------------------|

### `blogs`
| id | doctor_id | title | image | category | summary | content | is_draft | created_at |

---

## 🚀 How to Run the Project
1. **Clone the Repository**
   ```bash
   git clone https://github.com/rajansonali/project.git
   cd project
2.Install Dependencies
   npm install
   
3.Database Setup
Create a MySQL database (e.g., doctor_patient_blog).
Configure DB connection in .env file:
DB_HOST=localhost
DB_USER=root
DB_PASS=yourpassword
DB_NAME=doctor_patient_blog

4.Run Database Migrations
  npx sequelize db:migrate
5.Start the Application
  npm start
6.Open http://localhost:'....'in your browser.

📷 Screens (Expected)
Doctor Dashboard: Form to create blog post, list of doctor’s posts.

Patient Dashboard: Category-wise blogs with truncated summaries.

📌 Future Improvements:
Add rich text editor for blog content.

Implement search and filter by category.

Add likes & comments for patient interaction.

Add pagination for blog listing.

👩‍💻 Author
Sonali Rajan
📧 GitHub Profile
