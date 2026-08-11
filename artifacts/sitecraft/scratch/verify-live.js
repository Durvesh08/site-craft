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
    console.error('Registration failed:', regRes.status, await regRes.text());
    return;
  }
  console.log('✅ Registration succeeded!');

  console.log('2. Logging in...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.status, await loginRes.text());
    return;
  }

  const cookies = loginRes.headers.get('set-cookie') || '';
  const tokenMatch = cookies.match(/token=([^;]+)/);
  if (!tokenMatch) {
    console.error('Token not found. Cookies:', cookies);
    return;
  }
  const token = tokenMatch[1];
  console.log('✅ Login succeeded!');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Check if healthz-check route exists (proves new code is deployed)
  console.log('\n3. Checking if /healthz-check exists (deployment version check)...');
  const hcRes = await fetch(`${BASE_URL}/healthz-check`, { headers });
  const hcStatus = hcRes.status;
  const hcBody = await hcRes.text();
  console.log(`   /healthz-check status: ${hcStatus}, body: ${hcBody}`);
  if (hcStatus === 200 && hcBody.includes('v2')) {
    console.log('✅ New code IS deployed on Render!');
  } else {
    console.log('⚠️  New code is NOT yet deployed on Render (old code still running)');
  }

  // Try creating a project
  console.log('\n4. Creating new project (POST /projects)...');
  const createRes = await fetch(`${BASE_URL}/projects`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Verification Project',
      businessDescription: 'A premium automated verification landing page.',
    }),
  });

  const createStatus = createRes.status;
  const createBody = await createRes.text();
  console.log(`   POST /projects status: ${createStatus}`);
  console.log(`   POST /projects body: ${createBody}`);

  if (createStatus === 201) {
    const createData = JSON.parse(createBody);
    const projectId = createData.id;
    console.log('✅ Project created successfully! ID:', projectId);

    console.log('\n5. Listing project files...');
    const filesRes = await fetch(`${BASE_URL}/projects/${projectId}/files`, { method: 'GET', headers });
    const filesBody = await filesRes.json();
    console.log(`   Files count: ${filesBody.files?.length}`);
    if (filesBody.files?.length > 0) {
      console.log('   Files:', filesBody.files.map(f => f.filePath).join(', '));
      console.log('\n🎉 SUCCESS: Project creation and file initialization work perfectly!');
    } else {
      console.log('⚠️  No files found after creation');
    }
  } else {
    console.error('❌ Project creation FAILED with status', createStatus);
  }
}

verify().catch(console.error);
