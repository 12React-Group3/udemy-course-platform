/**
 * Role-based Authorization Middleware
 *
 * Valid roles: 'admin', 'tutor', 'learner'
 * - admin: Full access (created manually, not via registration)
 * - tutor: Can create/manage courses
 * - learner: Can enroll and learn
 */

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        statusCode: 401
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        statusCode: 403
      });
    }

    next();
  };
};

// Convenience middleware for common use cases
export const adminOnly = authorize('admin');
export const tutorOnly = authorize('tutor');
export const tutorOrAdmin = authorize('admin', 'tutor');
export const learnerOnly = authorize('learner');
