import https from 'https';
const req = https.request('https://payments.yoco.com/api/checkouts', { method: 'POST' }, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(res.statusCode, data));
});
req.end();
