import jwt from 'jsonwebtoken'

export function signToken(user) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured')
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.ridex_token || req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ message: 'Authentication required' })
  try {
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'Authentication is not configured' })
    req.auth = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: 'Session expired' })
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => roles.includes(req.auth.role) ? next() : res.status(403).json({ message: 'Insufficient permissions' })
}
