// User & Auth

export type UserRole = 'admin' | 'teacher' | 'parent' | 'student';

export interface User {
    id: string;
    username: string;
    email: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    full_name: string;
    role: UserRole;
    phone: string | null;
    date_of_birth: string | null;
    address: string | null;
    profile_photo_url: string | null;
    is_active: boolean;
    date_joined: string;
    children?: any[];
}

export interface AuthTokens {
    access : string;
    refresh: string;
}

export interface LoginRequest {
    identifier: string;
    password: string;
}

export interface LoginResponse {
    user: User;
    tokens: AuthTokens;
    message: string;

}

export interface RegisterRequest {
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    password: string;
    password_confirm?: string;
    phone?: string;
    date_of_birth?: string;
}

export type RegisterData = RegisterRequest;


// Student Types

export type StudentStatus = 'active' | 'graduated' | 'transferred' | 'suspended';
export type Gender = 'M' | 'F';

export interface StudentProfile {
    id: string;
    admission_number: string;
    state_of_origin: string | null;
    place_of_birth: string | null;
    current_class: string | null;
    gender: Gender;
    blood_group: string | null;
    admission_date: string;
    status: StudentStatus;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    emergency_contact_relationship: string | null;
    medical_conditions: string | null;
    parent: string | null;
    created_at: string;
    updated_at: string;
}

export interface Student {
    user:User;
    student_profile: StudentProfile;
}


export interface CreateStudentRequest {
    email: string;
    username: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    phone?: string;
    date_of_birth: string;
    address?: string;
    password?: string;
    current_class?: string;
    gender: Gender;
    blood_group?: string;
    admission_date?: string;
    state_of_origin?: string;
    place_of_birth?: string;
    parent_id?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relationship?: string;
    medical_conditions?: string;
    status?: StudentStatus;
}


// Teacher Types

export type EmploymentStatus = 'full_time' | 'part_time' | 'contract';

export interface TeacherProfile {
    id: string;
    staff_id: string;
    employment_status: EmploymentStatus;
    date_of_joining: string;
    highest_qualification: string | null;
    specialization: string | null;
    years_of_experience: number;
    subjects_taught: string | null;
    monthly_salary: string | null;
    is_class_teacher: boolean;
    assigned_class: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    created_at: string;
    updated_at: string;
}


export interface Teacher {
    user: User;
    teacher_profile: TeacherProfile;
}


// Parent Types

export type RelationshipType = 'father' | 'mother' | 'guardian' | 'other';

export interface ParentProfile {
    id: string;
    relatioship_to_student: RelationshipType;
    occupation: string | null;
    employer: string | null;
    office_address: string | null;
    office_phone: string | null;
    created_at: string;
    updated_at: string;
}

// DashBoard Types

export interface AttendanceToday {
    present: number;
    absent: number;
    late: number;
    rate: number;
    classes_submitted: number;
}

export interface FeeDefaulter {
    name: string;
    admission_number: string;
    class_name: string;
    fee_type: string;
    balance: number;
}

export interface FinanceSummary {
    outstanding_fees_count: number;
    collected_today: number;
    fee_defaulters: FeeDefaulter[];
}

export interface ClassOverview {
    id: string;
    name: string;
    level: string;
    pupil_count: number;
    teacher_name: string | null;
}

export interface ActivityFeedItem {
    type: string;
    title: string;
    subtitle: string;
    time: string;
    color: 'emerald' | 'amber' | 'sky' | 'red';
}

export interface CurrentTermInfo {
    id: string;
    name: string;
    academic_year: string;
    start_date: string;
    end_date: string;
}

export interface DashboardStats {
    // Core counts
    total_pupils: number;
    total_teachers: number;
    total_parents: number;
    active_classes: number;
    total_classes: number;
    new_admissions: number;
    pending_enrollments: number;
    // Backwards compat
    total_students: number;
    active_students: number;
    // Nested
    attendance_today: AttendanceToday;
    finance: FinanceSummary;
    current_term: CurrentTermInfo | null;
    students_by_class: Record<string, number>;
    classes_overview: ClassOverview[];
    activity_feed: ActivityFeedItem[];
}

// Parent Profile Completion
export interface ParentProfileCompletionData {
    phone: string;
    address: string;
    relationship_to_student: string;
    passport_photo: File | null;
    id_document: File | null;
}


// Api Response

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}


export interface ApiError {
    error?: string;
    detail?: string;
    [key: string]: string | string[] | undefined;
}

// Academics Types
export interface AcademicYear {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
}

export interface Term {
    id: string;
    academic_year: string;
    academic_year_name?: string;
    name: '1st Term' | '2nd Term' | '3rd Term';
    start_date: string;
    end_date: string;
    is_current: boolean;
}

export interface ClassLevel {
    id: string;
    name: string;
    numeric_level: number;
}

export interface SchoolClass {
    id: string;
    name: string;
    level: string;
    level_name?: string;
    teacher: string | null;
    teacher_name?: string;
    academic_year: string;
}

export interface Subject {
    id: string;
    name: string;
    code: string;
    level: string;
    level_name?: string;
}

export interface AssessmentType {
    id: string;
    name: string;
    max_score: number;
    weight: number;
}

export interface Assessment {
    id: string;
    name: string;
    assessment_type: string;
    type_name?: string;
    school_class: string;
    class_name?: string;
    subject: string;
    subject_name?: string;
    term: string;
    term_name?: string;
    date_administered: string;
}

export interface StudentScore {
    id: string;
    student: string;
    student_name?: string;
    assessment: string;
    assessment_name?: string;
    score_obtained: number;
    remarks: string | null;
}

// Finance Types
export interface FeeType {
    id: string;
    name: string;
    description: string | null;
    amount: number;
    level: string;
    level_name?: string;
}

export interface StudentFee {
    id: string;
    student: string;
    student_name?: string;
    fee_type: string;
    fee_type_name?: string;
    term: string;
    term_name?: string;
    status: 'paid' | 'partial' | 'outstanding';
    amount_paid: number;
    balance: number;
}

export interface PaymentRecord {
    id: string;
    student_fee: string;
    amount: number;
    payment_method: 'cash' | 'transfer' | 'card' | 'online';
    transaction_id: string | null;
    date: string;
    received_by: string | null;
    received_by_name?: string;
    student_name?: string;
}

export interface Payroll {
    id: string;
    teacher: string;
    teacher_name?: string;
    month: number;
    year: number;
    basic_salary: number;
    bonuses: number;
    deductions: number;
    net_salary: number;
    status: 'draft' | 'paid' | 'cancelled';
    payment_date: string | null;
}

// Attendance Types
export interface StudentAttendance {
    id: string;
    student: string;
    student_name?: string;
    school_class: string;
    class_name?: string;
    term: string;
    term_name?: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    remarks: string | null;
}

export interface TeacherAttendance {
    id: string;
    teacher: string;
    teacher_name?: string;
    date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    status: 'present' | 'absent' | 'on_leave';
}

// Notifications
export interface Notification {
    id: string;
    sender: string | null;
    sender_name?: string | null;
    recipient: string;
    recipient_name?: string;
    title: string;
    message: string;
    category: 'general' | 'attendance' | 'finance' | 'academics' | 'enrollment';
    audience: 'selected' | 'all_teachers' | 'all_parents' | 'all_students' | 'all_staff';
    is_read: boolean;
    created_at: string;
    read_at: string | null;
}

// Enrollment Types
export type EnrollmentStatusType = 'pending' | 'approved' | 'denied' | 'none';

export interface EnrollmentStatus {
    status: EnrollmentStatusType;
    linked_students_count: number;
    has_enrollment_request: boolean;
    enrollment_created_at: string | null;
}

export interface StudentAdmissionDetail {
    id: string;
    full_name: string;
    admission_number: string;
    class_name: string;
    gender: Gender;
    status: StudentStatus;
}
