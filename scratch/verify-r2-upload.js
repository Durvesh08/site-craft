const BASE_URL = 'https://site-craft-1.onrender.com/api';

async function verifyR2() {
  const email = `test-user-${Math.random().toString(36).substring(7)}@example.com`;
  const password = 'test-password-123';

  console.log('1. Registering test user...');
  await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName: 'R2', lastName: 'Tester' }),
  });

  console.log('2. Logging in...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const cookies = loginRes.headers.get('set-cookie') || '';
  const tokenMatch = cookies.match(/token=([^;]+)/);
  if (!tokenMatch) {
    console.error('Token not found.');
    return;
  }
  const token = tokenMatch[1];
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  console.log('3. Requesting upload URL from backend (POST /storage/uploads/request-url)...');
  const reqRes = await fetch(`${BASE_URL}/storage/uploads/request-url`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'test-r2-file.txt',
      size: 11,
      contentType: 'text/plain',
    }),
  });

  if (!reqRes.ok) {
    console.error('Request upload URL failed:', reqRes.status, await reqRes.text());
    return;
  }

  const { uploadURL, objectPath } = await reqRes.json();
  console.log('✅ Received upload URL and objectPath!');
  console.log('   objectPath:', objectPath);

  console.log('4. Uploading content directly to the upload URL (PUT)...');
  const uploadContent = 'Hello R2 Storage Works!';
  const putRes = await fetch(uploadURL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: uploadContent,
  });

  if (!putRes.ok) {
    console.error('Direct PUT to upload URL failed:', putRes.status, await putRes.text());
    return;
  }
  console.log('✅ Upload succeeded!');

  console.log('5. Retrieving the uploaded file from R2 public URL (GET)...');
  const getRes = await fetch(objectPath);
  if (!getRes.ok) {
    console.error('Failed to retrieve file from public URL:', getRes.status, await getRes.text());
    return;
  }

  const retrievedText = await getRes.text();
  console.log('   Retrieved text:', retrievedText);
  if (retrievedText === uploadContent) {
    console.log('\n🎉 SUCCESS: Object storage R2 upload and retrieval verified end-to-end!');
  } else {
    console.error('❌ Mismatched content retrieved!');
  }
}

verifyR2().catch(console.error);
