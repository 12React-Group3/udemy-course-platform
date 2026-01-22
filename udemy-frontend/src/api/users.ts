import apiClient from './apiClient';
import { API_PATHS } from './apiPaths';
import type {
  User,
  UserRole,
  GetAllUsersResponse,
  DeleteUserResponse,
  UpdateRoleResponse,
  GetMyStudentsResponse,
} from '../types';

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<User[]> {
  const response = await apiClient.get<GetAllUsersResponse>(API_PATHS.USERS.GET_ALL);
  return response.data.data;
}

/**
 * Delete a user by ID (admin only)
 */
export async function deleteUser(userId: string): Promise<void> {
  await apiClient.delete<DeleteUserResponse>(API_PATHS.USERS.DELETE(userId));
}

/**
 * Update a user's role (admin only)
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<User> {
  const response = await apiClient.put<UpdateRoleResponse>(
    API_PATHS.USERS.UPDATE_ROLE(userId),
    { role }
  );
  return response.data.data;
}

/**
 * Get students enrolled in tutor's courses (tutor only)
 */
export async function getMyStudents(): Promise<GetMyStudentsResponse['data']> {
  const response = await apiClient.get<GetMyStudentsResponse>(API_PATHS.USERS.MY_STUDENTS);
  return response.data.data;
}
