export interface AuthenticatedUser {
  id: number;
  email: string;
  name?: string;
  fullName?: string;
  roles: string[];
  permissions: string[];
}
