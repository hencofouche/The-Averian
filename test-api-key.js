import https from 'https';

const apiKey = 'AIzaSyCCHzwVLfKflfvtoJ4c37bJ3m6nOh8Pink';
const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`;

const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
});

req.on('error', (e) => console.error(e));
req.write(JSON.stringify({ token: 'dummy', returnSecureToken: true }));
req.end();
