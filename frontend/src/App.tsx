import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DialogProvider } from './context/DialogContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/Login'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Enrollment = lazy(() => import('./pages/Enrollment'));

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Students = lazy(() => import('./pages/Students'));
const Teachers = lazy(() => import('./pages/Teachers'));
const Parents = lazy(() => import('./pages/Parents'));
const ClassesPage = lazy(() => import('./pages/Classes'));
const Academics = lazy(() => import('./pages/Academics'));
const Finance = lazy(() => import('./pages/Finance'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Reports = lazy(() => import('./pages/Reports'));
const AdminMaterials = lazy(() => import('./pages/AdminMaterials'));
const AdminTickets = lazy(() => import('./pages/AdminTickets'));

const TeacherDashboard = lazy(() => import('./pages/Dashboard/TeacherDashboard'));
const MyClass = lazy(() => import('./pages/Teachers/MyClass'));
const TeacherAttendance = lazy(() => import('./pages/Attendance/TeacherAttendance'));
const Scores = lazy(() => import('./pages/Scores'));
const UploadMaterials = lazy(() => import('./pages/Teachers/UploadMaterials'));
const MySalary = lazy(() => import('./pages/Teachers/MySalary'));
const TeacherMessages = lazy(() => import('./pages/Teachers/Messages'));

const MyChildren = lazy(() => import('./pages/Parents/MyChildren'));
const FeePayments = lazy(() => import('./pages/Parents/FeePayments'));
const ParentReports = lazy(() => import('./pages/Parents/ParentReports'));
const ParentTickets = lazy(() => import('./pages/Parents/ParentTickets'));

const StudentGrades = lazy(() => import('./pages/StudentGrades'));
const StudentAttendancePage = lazy(() => import('./pages/Attendance/StudentAttendance'));

const Settings = lazy(() => import('./pages/Settings'));
const Notifications = lazy(() => import('./pages/Notifications'));
const CalendarPage = lazy(() => import('./pages/Calendar'));

const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const NotFound = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="text-center">
      <p className="text-6xl font-black text-slate-700 mb-4">404</p>
      <p className="text-white font-semibold text-xl mb-2"> Page Not Found</p>
      <a href="/login" className="text-amber-400 text-sm hover:text-amber-300">← Back to Login</a>
    </div>
  </div>
);

// App

export default function App() {
  return (
    <BrowserRouter>
      <DialogProvider>
        <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/enrol" element={<Enrollment />} />
          <Route path="/register" element={<Enrollment />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Shared Protected Routes (Dashboard Layout) */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'parent', 'student']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Admin Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/students" element={<Students />} />
                <Route path="/teachers" element={<Teachers />} />
                <Route path="/parents" element={<Parents />} />
                <Route path="/classes" element={<ClassesPage />} />
                <Route path="/academics" element={<Academics />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/admin/materials" element={<AdminMaterials />} />
                <Route path="/admin/tickets" element={<AdminTickets />} />
              </Route>

              {/* Teacher Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
                <Route path="/teacher" element={<TeacherDashboard />} />
                <Route path="/teacher/class" element={<MyClass />} />
                <Route path="/teacher/attendance" element={<TeacherAttendance />} />
                <Route path="/teacher/scores" element={<Scores />} />
                <Route path="/teacher/reports" element={<Reports />} />
                <Route path="/teacher/materials" element={<UploadMaterials />} />
                <Route path="/teacher/salary" element={<MySalary />} />
                <Route path="/teacher/messages" element={<TeacherMessages />} />
              </Route>

              {/* Parent Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={['parent']} />}>
                <Route path="/parent" element={<Dashboard />} />
                <Route path="/parent/children" element={<MyChildren />} />
                <Route path="/parent/fees" element={<FeePayments />} />
                <Route path="/parent/reports" element={<ParentReports />} />
                <Route path="/parent/tickets" element={<ParentTickets />} />
              </Route>

              {/* Student Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                <Route path="/student" element={<Dashboard />} />
                <Route path="/student/grades" element={<StudentGrades />} />
                <Route path="/student/attendance" element={<StudentAttendancePage />} />
              </Route>

              {/* Common Routes */}
              <Route path="/settings" element={<Settings />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/calendar" element={<CalendarPage />} />
            </Route>
          </Route>

          {/* Catch All - 404 Not Found */}
          <Route path="*" element={<NotFound />} />


        </Routes>
        </Suspense>
        </AuthProvider>
      </DialogProvider>
    </BrowserRouter>

  );
}
