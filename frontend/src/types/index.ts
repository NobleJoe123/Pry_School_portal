export interface User {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: 'admin' | 'teacher' | 'student';
    profile_photo: string | null;

}

export interface LoginData {
    email: string;
    password: string;
}


export interface RegisterData {
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    password: string;
}
