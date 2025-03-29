import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import './pages/Home.css'

function LoginPage() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: ''
  })
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        setError('两次输入的密码不一致')
        return
      }
      if (formData.password.length < 6) {
        setError('密码长度至少为6位')
        return
      }
      if (!formData.email.includes('@')) {
        setError('请输入有效的邮箱地址')
        return
      }
    }

    // 模拟登录成功
    if (isLogin && formData.username && formData.password) {
      // 这里可以添加实际的登录逻辑
      console.log('登录成功:', formData)
      navigate('/home')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  return (
    <div className="auth-container">
      <div className="auth-content">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>{isLogin ? '请登录您的账号' : '创建新账号'}</p>
        </div>
        
        <div className="auth-box">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">用户名</label>
              <input
                id="username"
                type="text"
                name="username"
                placeholder="请输入用户名"
                value={formData.username}
                onChange={handleInputChange}
                required
              />
            </div>

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="email">邮箱</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="请输入邮箱"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">密码</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="请输入密码"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="confirmPassword">确认密码</label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  placeholder="请再次输入密码"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                />
              </div>
            )}

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="submit-btn">
              {isLogin ? '登录' : '注册'}
            </button>

            <div className="form-footer">
              <div className="remember-me">
                <input type="checkbox" id="remember" />
                <label htmlFor="remember">记住我</label>
                {isLogin && <a href="#" className="forgot-password">忘记密码？</a>}
              </div>
            </div>
          </form>
        </div>

        <div className="auth-footer">
          <p>
            {isLogin ? '还没有账号？' : '已有账号？'}
            <button 
              className="switch-mode-btn"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? '立即注册' : '立即登录'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<Home />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
