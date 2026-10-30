const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.json({
    message: 'QuickGig API is running',
    endpoints: '/api/signup, /api/login, /api/jobs, /api/applications'
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/quickgig', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  userType: { type: String, enum: ['seeker', 'company'], default: 'seeker' },
  phone: String,
  skills: [String], // for seekers
  experience: String, // for seekers
  resume: String, // file path for seekers
  companyName: String, // for companies
  description: String, // for companies
  website: String, // for companies
  logo: String, // file path for companies
  verified: { type: Boolean, default: false }, // for companies
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Job Schema
const jobSchema = new mongoose.Schema({
  title: String,
  description: String,
  company: String,
  location: String,
  salary: Number, // Changed to Number for filtering
  experience: String, // job requirements
  qualification: String, // job requirements
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Associate with user
  createdAt: { type: Date, default: Date.now }
});

const Job = mongoose.model('Job', jobSchema);

// Application Schema
const applicationSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  phone: String,
  resume: String, // file path
  coverLetter: String,
  appliedAt: { type: Date, default: Date.now }
});

const Application = mongoose.model('Application', applicationSchema);

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Access denied' });

  jwt.verify(token, process.env.JWT_SECRET || 'secretkey', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Company Only Middleware
const companyOnly = (req, res, next) => {
  if (req.user.userType !== 'company') {
    return res.status(403).json({ message: 'Access denied. Company account required.' });
  }
  next();
};

// Seeker Only Middleware
const seekerOnly = (req, res, next) => {
  if (req.user.userType !== 'seeker') {
    return res.status(403).json({ message: 'Access denied. Seeker account required.' });
  }
  next();
};

// Admin Only Middleware
const adminOnly = (req, res, next) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin account required.' });
  }
  next();
};

// Auth Routes
app.post('/api/signup', async (req, res) => {
  const { name, email, password, userType } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, userType: userType || 'seeker' });
    await user.save();
    res.status(201).json({ message: 'User created' });
  } catch (error) {
    res.status(400).json({ message: 'Error creating user', error });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id, email: user.email, userType: user.userType }, process.env.JWT_SECRET || 'secretkey');
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, userType: user.userType } });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error });
  }
});

// Admin Login Route
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (username === 'PreethiGeethaiKannan' && password === 'Geethai$$$2007@Kannan') {
    const token = jwt.sign({ userType: 'admin' }, process.env.JWT_SECRET || 'secretkey');
    res.json({ token, user: { userType: 'admin' } });
  } else {
    res.status(401).json({ message: 'Invalid admin credentials' });
  }
});

// Profile Routes
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error });
  }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.user.id, req.body, { new: true });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error });
  }
});

// File upload route
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.json({ filePath: req.file.path });
});

// Job Routes
app.get('/api/jobs', async (req, res) => {
  try {
    const { search, minSalary, maxSalary } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    if (minSalary) query.salary = { ...query.salary, $gte: Number(minSalary) };
    if (maxSalary) query.salary = { ...query.salary, $lte: Number(maxSalary) };
    const jobs = await Job.find(query).populate('userId', 'name email verified').sort({ 'userId.verified': -1, createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching jobs', error });
  }
});

app.post('/api/jobs', authenticateToken, companyOnly, async (req, res) => {
  try {
    const job = new Job({ ...req.body, userId: req.user.id });
    await job.save();
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Error adding job', error });
  }
});

app.put('/api/jobs/:id', authenticateToken, companyOnly, async (req, res) => {
  try {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Error updating job', error });
  }
});

app.delete('/api/jobs/:id', authenticateToken, companyOnly, async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json({ message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting job', error });
  }
});

// Application Routes
app.post('/api/applications', authenticateToken, seekerOnly, upload.single('resume'), async (req, res) => {
  const { jobId, phone, coverLetter } = req.body;
  const resume = req.file ? req.file.path : null;
  try {
    // Check if already applied
    const existing = await Application.findOne({ jobId, userId: req.user.id });
    if (existing) return res.status(400).json({ message: 'Already applied for this job' });
    const application = new Application({ jobId, userId: req.user.id, phone, resume, coverLetter });
    await application.save();
    res.json(application);
  } catch (error) {
    res.status(500).json({ message: 'Error applying for job', error });
  }
});

app.get('/api/applications', authenticateToken, seekerOnly, async (req, res) => {
  try {
    const applications = await Application.find({ userId: req.user.id }).populate({
      path: 'jobId',
      populate: {
        path: 'userId',
        select: 'companyName description website logo'
      }
    });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching applications', error });
  }
});

app.get('/api/jobs/:id/applications', authenticateToken, companyOnly, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job || job.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const applications = await Application.find({ jobId: req.params.id }).populate('userId', 'name email');
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching applications', error });
  }
});

app.put('/api/applications/:id', authenticateToken, companyOnly, async (req, res) => {
  const { status } = req.body;
  try {
    const application = await Application.findById(req.params.id).populate('jobId');
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (application.jobId.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    application.status = status;
    await application.save();
    res.json(application);
  } catch (error) {
    res.status(500).json({ message: 'Error updating application', error });
  }
});

// Admin Routes
app.get('/api/admin/companies', authenticateToken, adminOnly, async (req, res) => {
  try {
    const companies = await User.find({ userType: 'company' });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching companies', error });
  }
});

app.put('/api/admin/companies/:id/verify', authenticateToken, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { verified: true }, { new: true });
    if (!user) return res.status(404).json({ message: 'Company not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error verifying company', error });
  }
});

app.get('/api/admin/jobs', authenticateToken, adminOnly, async (req, res) => {
  try {
    const jobs = await Job.find().populate('userId', 'name email companyName');
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching jobs', error });
  }
});

app.delete('/api/admin/jobs/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json({ message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting job', error });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
