import https from 'https';
https.get('https://developer.yoco.com/api-reference/checkout-api/checkout/create-checkout', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const match = data.match(/https:\/\/payments\.yoco\.com\/api\/[a-zA-Z0-9\/_-]+/g);
    console.log(match ? [...new Set(match)] : 'No match');
  });
});
