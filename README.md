# EduMeet

A modern web application for managing appointment scheduling between teachers and students.

## Overview

Edumeet is a user-friendly application designed to streamline the process of scheduling and managing appointments. The platform caters to three user roles: students, teachers, and administrators, each with customized features and interfaces.

## Features

### User Authentication
- Secure login and registration system with role-based access control
- Password reset functionality and profile management
- User roles: Student, Teacher, and Admin

### Student Features
- Schedule appointments with teachers
- View and filter appointment history by status (pending, approved, cancelled, completed)
- Update personal profile information
- Change password with secure authentication

### Teacher Features
- Set and manage availability slots
- Approve, reject, or complete appointment requests
- Schedule appointments with students
- View appointment statistics and history
- Manage profile information including department and subjects taught

### Admin Features
- Administrative dashboard for user management
- System oversight and monitoring
- View system-wide statistics

### Core Functionality
- Real-time appointment status updates
- Secure user authentication with Firebase
- Responsive design for desktop and mobile use
- Role-specific user interfaces
- User-friendly feedback with toast notifications

## Technology Stack

- **Frontend**: React.js with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **State Management**: React Context API
- **Routing**: React Router
- **Build Tool**: Vite
- **UI Components**:
  - Radix UI primitives
  - Lucide React icons
  - React Hook Form for form validation
  - date-fns for date manipulation
  - Sonner for toast notifications

## Installation

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Firebase account

### Setup Instructions

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/appointment-simplifier.git
   cd appointment-simplifier
   ```

2. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```

3. Set up Firebase:
   - Create a Firebase project in the Firebase console
   - Set up Firebase Authentication and Firestore
   - Add your Firebase configuration to the project

4. Start the development server:
   ```
   npm run dev
   ```
   or
   ```
   yarn dev
   ```

5. Build for production:
   ```
   npm run build
   ```
   or
   ```
   yarn build
   ```

## Project Structure

- `/src` - Source code
  - `/components` - Reusable UI components
  - `/pages` - Page components for different routes
  - `/context` - React Context providers
  - `/lib` - Utilities and configuration
  - `/hooks` - Custom React hooks

## Usage

1. Register as a student or teacher (or login as admin)
2. Update your profile information
3. For teachers: Set your availability
4. For students: Browse teachers and request appointments
5. Manage appointments through the appointments dashboard

## Contributing

We welcome contributions to Appointment Simplifier! Please feel free to submit a pull request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 