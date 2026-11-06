export interface AuthUser {
	id: string;
	email: string;
	name: string;
	username?: string;
	user_type?: string | string[];
	roles?: string[];
	isAdmin?: boolean;
}

export interface KmitlTokenResponse {
	data?: {
		access_token?: string;
	};
	access_token?: string;
}

export interface KmitlUserInfo {
	email: string;
	username?: string;
	[key: string]: any;
}

export interface KmitlProfile {
	title?: string;
	firstname_th?: string;
	lastname_th?: string;
	name?: string;
	fullname?: string;
	[key: string]: any;
}

export interface KmitlLoginResult {
	token: string;
	model: {
		id: string;
		email: string;
		name: string;
		username?: string;
		user_type?: string;
	};
}
