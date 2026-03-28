import https from 'https';
https.get('https://js.yoco.com/sdk/v1/yoco-sdk-web.js', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(res.statusCode, data));
});
