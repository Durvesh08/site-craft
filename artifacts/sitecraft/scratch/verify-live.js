const BASE_URL = 'https://site-craft-1.onrender.com/api';

async function verify() {
  const email = `test-user-${Math.random().toString(36).substring(7)}@example.com`;
  const password = 'test-password-123';

  console.log(`1. Registering test user: ${email}...`);
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName: 'Test', lastName: 'User' }),
  });
  
  if (!regRes.ok) {
    console.error('Registration failed:', await regRes.text());
    return;
  }
  console.log('Registration succeeded!');

  console.log('2. Logging in...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!loginRes.ok) {
    console.error('Login failed:', await loginRes.text());
    return;
  }

  // Extract set-cookie token
  const cookies = loginRes.headers.get('set-cookie') || '';
  const tokenMatch = cookies.match(/token=([^;]+)/);
  if (!tokenMatch) {
    console.error('Token not found in login response headers. Cookies:', cookies);
    return;
  }
  const token = tokenMatch[1];
  console.log('Login succeeded! Token retrieved.');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  console.log('3. Creating new project (POST /projects)...');
  const projectBody = {
    name: 'Verification Project',
    businessDescription: 'A premium automated verification landing page with visual QA features.',
  };

  const createRes = await fetch(`${BASE_URL}/projects`, {
    method: 'POST',
    headers,
    body: JSON.stringify(projectBody),
  });

  const createStatus = createRes.status;
  const createData = await createRes.json();
  console.log('POST /projects response status:', createStatus);
  console.log('POST /projects response body:', JSON.stringify(createData, null, 2));

  if (createStatus !== 201) {
    console.error('Project creation failed with status', createStatus);
    return;
  }

  const projectId = createData.id;
  console.log(`4. Verifying project files initialized (GET /projects/${projectId}/files)...`);
  const filesRes = await fetch(`${BASE_URL}/projects/${projectId}/files`, {
    method: 'GET',
    headers,
  });

  const filesStatus = filesRes.status;
  const filesData = await filesRes.json();
  console.log('GET /projects/:id/files response status:', filesStatus);
  console.log('GET /projects/:id/files list count:', filesData.files?.length);
  console.log('First file path:', filesData.files?.[0]?.filePath);

  if (filesStatus === 200 && filesData.files?.length > 0) {
    console.log('\nSUCCESS: Project created and default files initialized perfectly on live Render deployment!');
  } else {
    console.error('Files check failed');
  }
}

verify().catch(console.error);
