# 🍃 Food Rescue AI

### Don't Waste It. Donate It. Make Someone Smile.

**Food Rescue AI** is an AI-powered social impact platform that connects food donors, NGOs, orphanages, shelters, and volunteers to reduce food waste and redistribute essential resources to people in need.



The platform combines intelligent donation matching, AI-assisted categorisation, resource management, and delivery coordination to make donations smarter, safer, and more transparent.

---

## 📌 1. Project Overview

Food Rescue AI aims to solve the problem of food and essential-resource wastage by creating a digital connection between people who have surplus resources and organisations that need them.



The platform supports donations such as:

- Prepared meals and packaged food
- Groceries, fruits, and vegetables
- Clothes, shoes, and blankets
- Books, stationery, and toys
- Household and daily essentials

## 🎯 2. Problem Statement

- Large amounts of usable food are wasted every day.
- NGOs often struggle to find suitable and nearby donations.
- Donors lack an easy way to identify verified receivers.
- Donation collection and delivery can be difficult to coordinate.
- Lack of transparency makes donation tracking difficult.

**Our Solution:** An intelligent platform that connects surplus resources with genuine needs.

## ✨ 3. Key Features

- User registration and role-based authentication.
- Donor dashboard and donation management.
- NGO registration and verification.
- Donation discovery and category-based search.
- AI-powered donation categorisation.
- Intelligent NGO matching.
- Volunteer pickup and delivery management.
- Donation status tracking.
- Admin dashboard and management.
- Verified donation impact analytics.

## 👥 4. User Roles

| Role           | Responsibilities                    |
| -------------- | ----------------------------------- |
| Donor          | Upload and manage donations         |
| NGO / Receiver | Publish needs and request donations |
| Volunteer      | Manage pickups and deliveries       |
| Administrator  | Verify NGOs and manage the platform |

## 🛠️ 5. Technology Stack

| Technology           | Purpose                      |
| -------------------- | ---------------------------- |
| React.js             | Frontend development         |
| CSS                  | UI design and responsiveness |
| Supabase             | Backend services             |
| PostgreSQL           | Relational database          |
| Supabase Auth        | Authentication               |
| Supabase Storage     | Image storage                |
| Google Gemini API    | AI-powered features          |
| Node.js / API routes | Server-side operations       |
| Vercel               | Frontend deployment          |

## 📂 6. Project Folder Structure

The project is organised into separate modules to keep the application clean, manageable, and easy to maintain.

The main parts of the project include:

- **Frontend:** Handles the user interface and different pages of the application.
- **Backend:** Manages application logic and server-side operations.
- **Database:** Stores user details, donations, NGO information, and other records using Supabase.
- **AI Integration:** Handles AI-powered features such as donation categorisation and intelligent matching.
- **Authentication:** Manages user registration, login, and role-based access.
- **Storage:** Stores donation images and other uploaded files.

This modular structure makes the project easier to develop, maintain, and expand in the future.

## 🗄️ 7. Database Architecture

The application uses Supabase PostgreSQL.



Planned database tables:

| Table             | Description                   |
| ----------------- | ----------------------------- |
| profiles          | User information and roles    |
| organisations     | NGO details and verification  |
| donations         | Donation listings             |
| ngo_needs         | NGO resource requirements     |
| donation_requests | Donation requests             |
| volunteer_tasks   | Pickup and delivery tasks     |
| delivery_records  | Handover and delivery records |

Database relationships will connect users, organisations, donations, requests, and delivery records.



Row Level Security (RLS) will protect sensitive information and restrict access according to user roles.

## 🔄 8. Application Workflow

1. Donor registers and logs in.
2. Donor creates a donation listing.
3. Donation information is stored in Supabase.
4. AI analyses the donation details.
5. The matching system recommends suitable verified NGOs.
6. NGO requests the donation.
7. Donor approves the request.
8. Volunteer coordinates pickup and delivery.
9. Receiver confirms successful handover.
10. The platform updates verified impact records.

**Donation Status:**



Available → Requested → Scheduled → Picked Up → Delivered

## 🤖 9. AI Multi-Agent Architecture

Food Rescue AI is designed around five specialised AI agents.

| AI Agent                    | Responsibility                               |
| --------------------------- | -------------------------------------------- |
| Donation Intake Agent       | Understands donation text, images, and voice |
| Safety & Rules Agent        | Applies food and item eligibility rules      |
| NGO Matching Agent          | Finds suitable verified receivers            |
| Logistics Agent             | Suggests pickup and delivery coordination    |
| Verification & Impact Agent | Updates verified donation records            |

An orchestrator will coordinate these agents and pass relevant information between them.

### AI Capabilities

- Image-based item categorisation.
- Text understanding and description generation.
- Voice-based donation intake.
- Intelligent NGO recommendations.
- Explainable donation matching.
- AI-assisted logistics suggestions.

**Important:** AI assists with food-safety checks but does not independently certify food as safe. Human review remains necessary.

## 🔐 10. Security and Food Safety

- Role-based access control.
- NGO verification before donation acceptance.
- Secure authentication and database policies.
- Protected API keys and environment variables.
- Human review for uncertain food-safety cases.
- OTP or receiver confirmation for handover.
- Restricted access to personal and pickup information.
- Applicable FSSAI food-safety requirements must be followed.

## 🌍 11. Expected Impact

- Reduce avoidable food waste.
- Improve access to essential resources.
- Support verified NGOs and community organisations.
- Improve donor-to-receiver coordination.
- Increase transparency in donation management.

Impact will be measured using verified platform records.

## 🔮 12. Future Scope

- Real-time location-based donation discovery.
- Automated volunteer coordination.
- Advanced AI-powered recommendations.
- Multilingual voice assistance.
- Expanded partnerships with NGOs and businesses.
- Advanced analytics and reporting.

## 🤝 13. Contribution

Contributions, suggestions, and improvements are welcome.

1. Fork the repository.
2. Create a new feature branch.
3. Make your changes.
4. Commit your changes.
5. Submit a Pull Request.

## 📜 14. Project Vision

**Connect surplus with need. Turn donations into impact.**



Our mission is to ensure that useful resources are not wasted when someone else needs them.

---

**Project:** Food Rescue AI\
**Category:** AI / Social Impact / Web Application\
**Database:** Supabase PostgreSQL\
**AI:** Google Gemini
