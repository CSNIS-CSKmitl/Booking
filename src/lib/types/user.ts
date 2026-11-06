import type { UserRole } from './role';

export interface User {
	id: string;
	email: string;
	name: string;
	username?: string;
	user_type?: string | string[];
	roles?: UserRole[] | string[];
	isAdmin?: boolean;
}
