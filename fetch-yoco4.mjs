import https from 'https';
const req = https.request('https://api.yoco.com/checkouts', { method: 'POST' }, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(res.statusCode, data));
});
req.end();
