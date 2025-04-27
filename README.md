# EduMeet 📚

A modern, responsive web app that simplifies appointment scheduling between students and teachers. Built for seamless interactions, role-based access, and a clean user experience!

---

## Features 🚀

### User Authentication 🔒
- Secure login and signup with Firebase Authentication
- Role-based access: Student, Teacher, Admin
- Password reset functionality

### Student Dashboard 🎓
- Book appointments with teachers easily
- View appointment history and status (pending, approved, completed, cancelled)
- Update profile details and change password securely

### Teacher Dashboard 👩‍🏫
- Set and manage your availability slots
- Approve, reject, or complete appointments
- View appointment statistics and manage your profile

### Admin Panel 🚰
- Oversee users (students and teachers)
- Monitor system-wide statistics and activities

### Core App Functionality ✨
- Real-time status updates
- Toast notifications for feedback
- Fully responsive design (desktop & mobile)
- Clean, role-specific UI layouts

---

## Tech Stack 🧰

- **React.js + TypeScript**: Modern frontend framework
- **Vite**: Fast build tool
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui + Radix UI**: Prebuilt UI components
- **Firebase**: Authentication, Firestore database, and Storage
- **React Context API**: Lightweight state management
- **React Router**: Smooth client-side routing
- **Lucide Icons**: Beautiful icon library
- **date-fns**: Date and time handling
- **Sonner**: Elegant toast notifications

---

## Setup Instructions 🛠️

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/edumeet.git
   cd edumeet
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```
   or
   ```bash
   yarn install
   ```

3. **Configure Firebase**:
   - Create a Firebase project from [Firebase Console](https://console.firebase.google.com/)
   - Set up Authentication, Firestore, and Storage
   - Add your Firebase credentials to a `.env` file at the project root (see `.env.example` for reference)

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   or
   ```bash
   yarn dev
   ```

5. **Build for Production**:
   ```bash
   npm run build
   ```
   or
   ```bash
   yarn build
   ```

---

## How to Use 🔋

1. **Students**: Register, update profile, book appointments with teachers.
2. **Teachers**: Set available times, manage appointment requests, and track appointment history.
3. **Admins**: Manage users and monitor the system easily from the dashboard.

---

## Project Structure 📁

```
/src
  /components    # Reusable UI components
  /pages         # Different app pages
  /context       # Context Providers for state
  /hooks         # Custom React hooks
  /lib           # Utility functions and Firebase setup
```

---

## Future Improvements 🔮
- Notifications for upcoming appointments
- Admin analytics dashboard
- Multi-language support
- Google Calendar integration

---

## Contributions 🤝

We welcome contributions to **EduMeet**!  
Feel free to fork the repo, create a branch, make your changes, and submit a pull request. 🚀

---

## License 📜

This project is licensed under the [MIT License](LICENSE).

---

## Contact 📬

Have questions, suggestions, or just want to say hi?  
Reach out to me at **[your-email@example.com]**.

