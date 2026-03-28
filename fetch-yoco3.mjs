import https from 'https';
https.get('https://developer.yoco.com/api-reference/checkout-api/checkout/create-checkout', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const regex = /https:\/\/payments\.yoco\.com\/api\/[a-zA-Z0-9\/_-]+/g;
    let match;
    while ((match = regex.exec(data)) !== null) {
      console.log(match[0]);
    }
  });
});
