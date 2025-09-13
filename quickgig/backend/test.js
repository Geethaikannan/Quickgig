const axios = require('axios');

const baseURL = 'http://localhost:5000/api';

async function testSignup() {
  try {
    const response = await axios.post(`${baseURL}/signup`, {
      name: 'Test Seeker',
      email: 'testseeker@example.com',
      password: 'password123',
      userType: 'seeker'
    });
    console.log('Signup Success:', response.data);
    return response.data;
  } catch (error) {
    console.log('Signup Error:', error.response.data);
  }
}

async function testLogin() {
  try {
    const response = await axios.post(`${baseURL}/login`, {
      email: 'testseeker@example.com',
      password: 'password123'
    });
    console.log('Login Success:', response.data);
    return response.data;
  } catch (error) {
    console.log('Login Error:', error.response.data);
  }
}

async function testProfile(token) {
  try {
    const response = await axios.get(`${baseURL}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Profile Success:', response.data);
    return response.data;
  } catch (error) {
    console.log('Profile Error:', error.response.data);
  }
}

async function testUpdateProfile(token) {
  try {
    const response = await axios.put(`${baseURL}/profile`, {
      phone: '1234567890',
      skills: ['JavaScript', 'React'],
      experience: '2 years'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Update Profile Success:', response.data);
    return response.data;
  } catch (error) {
    console.log('Update Profile Error:', error.response.data);
  }
}

async function testCompanySignup() {
  try {
    const response = await axios.post(`${baseURL}/signup`, {
      name: 'Test Company',
      email: 'testcompany2@example.com',
      password: 'password123',
      userType: 'company'
    });
    console.log('Company Signup Success:', response.data);
    return response.data;
  } catch (error) {
    console.log('Company Signup Error:', error.response.data);
  }
}

async function testCompanyLogin() {
  try {
    const response = await axios.post(`${baseURL}/login`, {
      email: 'testcompany2@example.com',
      password: 'password123'
    });
    console.log('Company Login Success:', response.data);
    return response.data;
  } catch (error) {
    console.log('Company Login Error:', error.response.data);
  }
}

async function testUpdateCompanyProfile(token) {
  try {
    const response = await axios.put(`${baseURL}/profile`, {
      companyName: 'Test Company Inc',
      description: 'A leading tech company',
      website: 'https://testcompany.com',
      phone: '0987654321'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Update Company Profile Success:', response.data);
    return response.data;
  } catch (error) {
    console.log('Update Company Profile Error:', error.response.data);
  }
}

async function testPostJob(token) {
  try {
    const response = await axios.post(`${baseURL}/jobs`, {
      title: 'Software Engineer',
      description: 'Develop web applications',
      company: 'Test Company',
      location: 'Remote',
      salary: 60000
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Post Job Success:', response.data);
    return response.data;
  } catch (error) {
    console.log('Post Job Error:', error.response.data);
  }
}

async function testGetJobs() {
  try {
    const response = await axios.get(`${baseURL}/jobs`);
    console.log('Get Jobs Success:', response.data);
    return response.data;
  } catch (error) {
    console.log('Get Jobs Error:', error.response.data);
  }
}

async function testApplyJob(token, jobId) {
  try {
    const response = await axios.post(`${baseURL}/applications`, {
      jobId,
      phone: '1234567890',
      resume: 'uploads/resume.pdf',
      coverLetter: 'I am interested in this position.'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Apply Job Success:', response.data);
    return response.data;
  } catch (error) {
    console.log('Apply Job Error:', error.response.data);
  }
}

async function testGetApplications(token) {
  try {
    const response = await axios.get(`${baseURL}/applications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Get Applications Success:', response.data);
    return response.data;
  } catch (error) {
    console.log('Get Applications Error:', error.response.data);
  }
}

async function runTests() {
  console.log('Starting API Tests...\n');

  // Test seeker signup and login
  await testSignup();
  const seekerLogin = await testLogin();
  if (seekerLogin && seekerLogin.token) {
    await testProfile(seekerLogin.token);
    await testUpdateProfile(seekerLogin.token);
  }

  // Test company signup and login
  await testCompanySignup();
  const companyLogin = await testCompanyLogin();
  let jobId;
  if (companyLogin && companyLogin.token) {
    await testUpdateCompanyProfile(companyLogin.token);
    const job = await testPostJob(companyLogin.token);
    if (job) jobId = job._id;
  }

  // Test get jobs
  await testGetJobs();

  // Test apply for job
  if (seekerLogin && seekerLogin.token && jobId) {
    await testApplyJob(seekerLogin.token, jobId);
    await testGetApplications(seekerLogin.token);
  }

  console.log('\nAPI Tests Completed.');
}

runTests();
