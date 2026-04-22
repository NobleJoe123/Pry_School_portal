// User & Auth

export type UserRole = 'admin' | 'teacher' | 'parent' | 'student';

export interface User {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    role: UserRole;
    phone: string | null;
    date_of_birth: string | null;
    address: string | null;
    profile_photo_url: string | null;
    is_active: boolean;
    date_joined: string;
}

export interface AuthTokens {
    access : string;
    refresh: string;
}

export interface LoginRequest {
    email: string;
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
    password_confirm: string;
    phone?: string;
    date_of_birth: string;

}

// Student Types

export type StudentStatus = 'active' | 'graduated' | 'transferred' | 'suspended';
export type Gender = 'M' | 'F';

export interface StudentProfile {
    id: string;
    admission_number: string;
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
    last_name: string;
    phone?: string;
    date_of_birth: string;
    address?: string;
    password?: string;
    current_class?: string;
    gender: Gender;
    blood_group?: string;
    admission_date?: string;
    admission_number: string;
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

export interface DashboardStats {
    total_students: number;
    active_students: number;
    total_teachers: number;
    total_parents: number;
    students_by_class: Record<string, number>;
    recent_registrations: number;
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