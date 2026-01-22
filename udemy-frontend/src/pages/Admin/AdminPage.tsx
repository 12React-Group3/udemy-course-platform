import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllUsers, deleteUser, updateUserRole } from '../../api/users';
import type { User, UserRole } from '../../types';
import { Users, GraduationCap, BookOpen, Shield, Search, Trash2, AlertTriangle } from 'lucide-react';
import './AdminPage.css';

interface DeleteModalProps {
  user: User | null;
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteModal({ user, isOpen, isDeleting, onClose, onConfirm }: DeleteModalProps) {
  if (!isOpen || !user) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">
          <AlertTriangle />
        </div>
        <h3 className="modal-title">Delete User</h3>
        <p className="modal-message">
          Are you sure you want to delete <strong>{user.userName}</strong>? This action cannot be undone.
        </p>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onClose} disabled={isDeleting}>
            Cancel
          </button>
          <button className="modal-btn confirm" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalUser, setDeleteModalUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.userName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = users.length;
    const tutors = users.filter((u) => u.role === 'tutor').length;
    const learners = users.filter((u) => u.role === 'learner').length;
    const admins = users.filter((u) => u.role === 'admin').length;
    return { total, tutors, learners, admins };
  }, [users]);

  // Handle delete
  const handleDeleteClick = (user: User) => {
    setDeleteModalUser(user);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalUser) return;

    try {
      setIsDeleting(true);
      await deleteUser(deleteModalUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteModalUser.id));
      setDeleteModalUser(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle role change
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setUpdatingRoleFor(userId);
      const updatedUser = await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updatedUser.role } : u))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setUpdatingRoleFor(null);
    }
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="admin-title">User Management</h1>
        <p className="admin-subtitle">Manage users, roles, and permissions</p>
      </header>

      {/* Stats Cards */}
      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-icon total">
            <Users />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon tutors">
            <BookOpen />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.tutors}</div>
            <div className="stat-label">Tutors</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon learners">
            <GraduationCap />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.learners}</div>
            <div className="stat-label">Learners</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon admins">
            <Shield />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.admins}</div>
            <div className="stat-label">Admins</div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <section className="users-section">
        <div className="users-header">
          <h2 className="users-title">All Users</h2>
          <div className="users-search">
            <Search />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading users...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={loadUsers}>Try Again</button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <Users />
            <p>{searchQuery ? 'No users match your search' : 'No users found'}</p>
          </div>
        ) : (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Change Role</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {user.profileImage ? (
                            <img src={user.profileImage} alt={user.userName} />
                          ) : (
                            getInitials(user.userName)
                          )}
                        </div>
                        <div className="user-details">
                          <div className="user-name">{user.userName}</div>
                          <div className="user-email">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${user.role}`}>{user.role}</span>
                    </td>
                    <td>
                      {user.role === 'admin' ? (
                        <span className="role-badge admin">Admin</span>
                      ) : (
                        <select
                          className="role-select"
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          disabled={updatingRoleFor === user.id}
                        >
                          <option value="tutor">Tutor</option>
                          <option value="learner">Learner</option>
                        </select>
                      )}
                    </td>
                    <td className="date-cell">{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="action-btn delete"
                          onClick={() => handleDeleteClick(user)}
                          disabled={user.role === 'admin'}
                          title={user.role === 'admin' ? 'Cannot delete admin' : 'Delete user'}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        user={deleteModalUser}
        isOpen={deleteModalUser !== null}
        isDeleting={isDeleting}
        onClose={() => setDeleteModalUser(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
