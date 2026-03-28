import https from 'https';
const data = JSON.stringify({
  amount: 45000,
  currency: 'ZAR',
  successUrl: 'http://localhost:3000/?payment=success',
  cancelUrl: 'http://localhost:3000/?payment=cancel'
});
const req = https.request('https://payments.yoco.com/api/checkouts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk_test_24cb0bf2GVzG8nl403046679e9f7',
    'Content-Length': data.length
  }
}, (res) => {
  let resData = '';
  res.on('data', (chunk) => resData += chunk);
  res.on('end', () => console.log(res.statusCode, resData));
});
req.write(data);
req.end();
