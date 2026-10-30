import { useEffect, useState } from 'react'
import './App.css'

const API_URL = 'http://localhost:5000'

const initialAuthForm = {
  name: '',
  email: '',
  username: '',
  password: '',
  userType: 'seeker',
}

const initialJobForm = {
  title: '',
  company: '',
  location: '',
  salary: '',
  description: '',
  experience: '',
  qualification: '',
}

function App() {
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [companyJobs, setCompanyJobs] = useState([])
  const [companyApplications, setCompanyApplications] = useState({})
  const [adminCompanies, setAdminCompanies] = useState([])
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState(initialAuthForm)
  const [jobForm, setJobForm] = useState(initialJobForm)
  const [applyForm, setApplyForm] = useState({ jobId: '', phone: '', coverLetter: '' })
  const [token, setToken] = useState(localStorage.getItem('quickgig_token') || '')
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem('quickgig_user') || 'null'),
  )
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadJobs()
  }, [])

  useEffect(() => {
    if (token && currentUser?.userType === 'seeker') {
      loadApplications()
    }

    if (token && currentUser?.userType === 'company') {
      loadCompanyJobs()
    }

    if (token && currentUser?.userType === 'admin') {
      loadAdminCompanies()
    }
  }, [token, currentUser])

  const loadJobs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/jobs`)
      const data = await res.json()
      setJobs(Array.isArray(data) ? data : [])
    } catch (error) {
      setStatus('Unable to load jobs right now.')
    }
  }

  const loadApplications = async () => {
    try {
      const res = await fetch(`${API_URL}/api/applications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      setApplications(Array.isArray(data) ? data : [])
    } catch (error) {
      setStatus('Unable to load your applications.')
    }
  }

  const loadCompanyJobs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/jobs`)
      const data = await res.json()
      const myJobs = (Array.isArray(data) ? data : []).filter((job) => {
        return (
          job.userId && (
            job.userId._id === currentUser?.id ||
            job.userId.email === currentUser?.email ||
            job.userId.name === currentUser?.name
          )
        )
      })
      setCompanyJobs(myJobs)
    } catch (error) {
      setStatus('Unable to load your company jobs.')
    }
  }

  const viewApplicationsForJob = async (jobId) => {
    if (!token) return

    try {
      const res = await fetch(`${API_URL}/api/jobs/${jobId}/applications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      setCompanyApplications((prev) => ({
        ...prev,
        [jobId]: Array.isArray(data) ? data : [],
      }))
    } catch (error) {
      setStatus('Unable to load applications for this job.')
    }
  }

  const loadAdminCompanies = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/companies`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      setAdminCompanies(Array.isArray(data) ? data : [])
    } catch (error) {
      setStatus('Unable to load companies for verification.')
    }
  }

  const persistSession = (nextToken, nextUser) => {
    setToken(nextToken)
    setCurrentUser(nextUser)
    localStorage.setItem('quickgig_token', nextToken)
    localStorage.setItem('quickgig_user', JSON.stringify(nextUser))
  }

  const handleAuthChange = (event) => {
    const { name, value } = event.target
    setAuthForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setStatus('')

    try {
      let endpoint = `${API_URL}/api/login`
      let payload = {
        email: authForm.email,
        password: authForm.password,
      }

      if (authMode === 'signup') {
        endpoint = `${API_URL}/api/signup`
        payload = {
          name: authForm.name,
          email: authForm.email,
          password: authForm.password,
          userType: authForm.userType,
        }
      }

      if (authMode === 'admin') {
        endpoint = `${API_URL}/api/admin/login`
        payload = {
          username: authForm.username,
          password: authForm.password,
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed')
      }

      if (authMode === 'signup') {
        setAuthMode('login')
        setAuthForm({ ...initialAuthForm, userType: 'seeker' })
        setStatus('Account created. Please log in to continue.')
      } else {
        persistSession(data.token, data.user)
        setStatus(authMode === 'admin' ? 'Admin access granted.' : 'Welcome back!')
      }
    } catch (error) {
      setStatus(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleJobSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setStatus('')

    try {
      const res = await fetch(`${API_URL}/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...jobForm,
          salary: Number(jobForm.salary) || 0,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Unable to post job')
      }

      setJobForm(initialJobForm)
      await loadJobs()
      await loadCompanyJobs()
      setStatus('Job posted successfully!')
    } catch (error) {
      setStatus(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async (event, jobId) => {
    event.preventDefault()
    setLoading(true)
    setStatus('')

    try {
      const payload = {
        jobId,
        phone: applyForm.phone || '',
        coverLetter: applyForm.coverLetter || '',
      }

      const res = await fetch(`${API_URL}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Unable to apply')
      }

      setApplyForm({ jobId: '', phone: '', coverLetter: '' })
      await loadApplications()
      setStatus('Application submitted successfully.')
    } catch (error) {
      setStatus(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCompanyVerification = async (companyId) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/companies/${companyId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Unable to verify company')
      }

      await loadAdminCompanies()
      setStatus(`${data.name || 'Company'} was verified successfully.`)
    } catch (error) {
      setStatus(error.message)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('quickgig_token')
    localStorage.removeItem('quickgig_user')
    setToken('')
    setCurrentUser(null)
    setStatus('You have been logged out.')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">Q</div>
          <div>
            <div className="brand-name">QuickGig</div>
            <div className="brand-tag">Find work. Hire talent.</div>
          </div>
        </div>

        <nav className="nav-links">
          <a href="#jobs">Jobs</a>
          <a href="#platform">Platform</a>
          <a href="#support">Support</a>
        </nav>

        {currentUser ? (
          <div className="user-box">
            <span>
              {currentUser.name || currentUser.email} · {currentUser.userType}
            </span>
            <button type="button" className="ghost-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <button type="button" className="primary-btn" onClick={() => setAuthMode('login')}>
            Login
          </button>
        )}
      </header>

      <main className="main-content">
        <section className="hero-panel">
          <div className="hero-copy">
            <span className="eyebrow">FAST-TRACK YOUR NEXT MOVE</span>
            <h1>Build your career and hire smarter.</h1>
            <p>
              QuickGig connects motivated job seekers with companies that are ready to hire.
            </p>
            <div className="cta-row">
              <a href="#jobs" className="primary-btn">
                Explore jobs
              </a>
              <a href="#auth" className="secondary-btn">
                Join now
              </a>
            </div>
          </div>
          <div className="hero-stats">
            <div className="stat-card">
              <strong>12k+</strong>
              <span>Active seekers</span>
            </div>
            <div className="stat-card">
              <strong>900+</strong>
              <span>Hiring partners</span>
            </div>
            <div className="stat-card">
              <strong>4.9/5</strong>
              <span>Candidate rating</span>
            </div>
          </div>
        </section>

        {status && <div className="status-banner">{status}</div>}

        {!currentUser && (
          <section className="layout-grid">
            <aside className="panel auth-panel" id="auth">
              <div className="panel-header">
                <h2>{authMode === 'login' ? 'Welcome back' : authMode === 'signup' ? 'Create account' : 'Admin access'}</h2>
                <div className="toggle-row">
                  <button
                    type="button"
                    className={authMode === 'login' ? 'mode-btn active' : 'mode-btn'}
                    onClick={() => setAuthMode('login')}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    className={authMode === 'signup' ? 'mode-btn active' : 'mode-btn'}
                    onClick={() => setAuthMode('signup')}
                  >
                    Sign up
                  </button>
                  <button
                    type="button"
                    className={authMode === 'admin' ? 'mode-btn active' : 'mode-btn'}
                    onClick={() => setAuthMode('admin')}
                  >
                    Admin
                  </button>
                </div>
              </div>

              <form onSubmit={handleAuthSubmit} className="stack-form">
                {authMode === 'signup' && (
                  <label>
                    Full name
                    <input
                      type="text"
                      name="name"
                      value={authForm.name}
                      onChange={handleAuthChange}
                      placeholder="Jane Doe"
                      required
                    />
                  </label>
                )}

                {authMode === 'admin' && (
                  <label>
                    Username
                    <input
                      type="text"
                      name="username"
                      value={authForm.username}
                      onChange={handleAuthChange}
                      placeholder="PreethiGeethaiKannan"
                      required
                    />
                  </label>
                )}

                {authMode !== 'admin' && (
                  <label>
                    Email
                    <input
                      type="email"
                      name="email"
                      value={authForm.email}
                      onChange={handleAuthChange}
                      placeholder="you@example.com"
                      required
                    />
                  </label>
                )}

                <label>
                  Password
                  <input
                    type="password"
                    name="password"
                    value={authForm.password}
                    onChange={handleAuthChange}
                    placeholder="••••••••"
                    required
                  />
                </label>

                {authMode === 'signup' && (
                  <label>
                    I am a
                    <select
                      name="userType"
                      value={authForm.userType}
                      onChange={handleAuthChange}
                    >
                      <option value="seeker">Job seeker</option>
                      <option value="company">Company</option>
                    </select>
                  </label>
                )}

                <button type="submit" className="primary-btn full-width" disabled={loading}>
                  {loading
                    ? 'Please wait...'
                    : authMode === 'login'
                      ? 'Login'
                      : authMode === 'signup'
                        ? 'Create account'
                        : 'Admin login'}
                </button>
              </form>
            </aside>

            <section className="panel jobs-panel" id="jobs">
              <div className="panel-header">
                <h2>Available roles</h2>
                <span>{jobs.length} open roles</span>
              </div>

              <div className="jobs-list">
                {jobs.length === 0 ? (
                  <p className="empty-state">No jobs posted yet. Check back soon.</p>
                ) : (
                  jobs.map((job) => (
                    <article className="job-card" key={job._id}>
                      <div className="job-head">
                        <div>
                          <h3>{job.title}</h3>
                          <p>{job.company}</p>
                        </div>
                        <span className="salary">₹{job.salary?.toLocaleString() || 'N/A'}</span>
                      </div>

                      <div className="meta-row">
                        <span>{job.location}</span>
                        <span>{job.experience || 'Experience flexible'}</span>
                      </div>

                      <p>{job.description}</p>

                      <div className="job-foot">
                        <span>{job.qualification || 'Open to all qualified candidates'}</span>
                        <span className="hint">Login as a seeker to apply.</span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </section>
        )}

        {currentUser?.userType === 'company' && (
          <section className="panel dashboard-panel">
            <div className="panel-header dashboard-header">
              <h2>Company dashboard</h2>
              <span>{companyJobs.length} active jobs</span>
            </div>

            <div className="dashboard-grid">
              <div className="panel inner-panel">
                <h3>Post a new role</h3>
                <form onSubmit={handleJobSubmit} className="job-form-grid">
                  <label>
                    Job title
                    <input
                      type="text"
                      value={jobForm.title}
                      onChange={(event) =>
                        setJobForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Company
                    <input
                      type="text"
                      value={jobForm.company}
                      onChange={(event) =>
                        setJobForm((prev) => ({ ...prev, company: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Location
                    <input
                      type="text"
                      value={jobForm.location}
                      onChange={(event) =>
                        setJobForm((prev) => ({ ...prev, location: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Salary
                    <input
                      type="number"
                      value={jobForm.salary}
                      onChange={(event) =>
                        setJobForm((prev) => ({ ...prev, salary: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className="full-span">
                    Description
                    <textarea
                      rows="3"
                      value={jobForm.description}
                      onChange={(event) =>
                        setJobForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    Experience
                    <input
                      type="text"
                      value={jobForm.experience}
                      onChange={(event) =>
                        setJobForm((prev) => ({ ...prev, experience: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Qualification
                    <input
                      type="text"
                      value={jobForm.qualification}
                      onChange={(event) =>
                        setJobForm((prev) => ({ ...prev, qualification: event.target.value }))
                      }
                    />
                  </label>
                  <button type="submit" className="primary-btn full-width" disabled={loading}>
                    Publish role
                  </button>
                </form>
              </div>

              <div className="panel inner-panel">
                <h3>Your jobs</h3>
                <div className="company-jobs-list">
                  {companyJobs.length === 0 ? (
                    <p className="empty-state">You have not posted any jobs yet.</p>
                  ) : (
                    companyJobs.map((job) => (
                      <div className="company-job-item" key={job._id}>
                        <div>
                          <strong>{job.title}</strong>
                          <p>{job.location}</p>
                        </div>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => viewApplicationsForJob(job._id)}
                        >
                          View applicants
                        </button>
                        {companyApplications[job._id] && companyApplications[job._id].length > 0 ? (
                          <ul className="applicant-list">
                            {companyApplications[job._id].map((application) => (
                              <li key={application._id}>
                                <span>{application.userId?.name || 'Candidate'}</span>
                                <span className={`status-pill ${application.status}`}>{application.status}</span>
                              </li>
                            ))}
                          </ul>
                        ) : companyApplications[job._id] ? (
                          <p className="empty-state small">No applications yet.</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {currentUser?.userType === 'seeker' && (
          <section className="panel applications-panel">
            <div className="panel-header">
              <h2>Your applications</h2>
            </div>

            <div className="applications-list">
              {applications.length === 0 ? (
                <p className="empty-state">You have not applied to any roles yet.</p>
              ) : (
                applications.map((application) => (
                  <div className="application-row" key={application._id}>
                    <div>
                      <strong>{application.jobId?.title || 'Role'}</strong>
                      <span>{application.jobId?.company || 'Company'}</span>
                    </div>
                    <span className={`status-pill ${application.status}`}>{application.status}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {currentUser?.userType === 'admin' && (
          <section className="panel dashboard-panel">
            <div className="panel-header dashboard-header">
              <h2>Admin verification</h2>
              <span>{adminCompanies.length} companies</span>
            </div>

            <div className="admin-company-list">
              {adminCompanies.map((company) => (
                <div className="admin-company-row" key={company._id}>
                  <div>
                    <strong>{company.companyName || company.name}</strong>
                    <p>{company.email}</p>
                  </div>
                  <button
                    type="button"
                    className="primary-btn small-btn"
                    onClick={() => handleCompanyVerification(company._id)}
                    disabled={company.verified}
                  >
                    {company.verified ? 'Verified' : 'Verify'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
