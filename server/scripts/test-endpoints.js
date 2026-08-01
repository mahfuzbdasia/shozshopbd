const http = require('http');
const urls = [
  {path: '/admin/settings.html', name: 'settings'},
  {path: '/api/facebook-catalog.xml', name: 'feed'},
];
const host = '127.0.0.1';
const port = 3000;

function check(urlObj) {
  return new Promise((resolve) => {
    const req = http.request({hostname: host, port, path: urlObj.path, method: 'GET'}, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({name: urlObj.name, status: res.statusCode, length: body.length, startsWith: body.slice(0, 100)});
      });
    });
    req.on('error', (err) => resolve({name: urlObj.name, error: err.message}));
    req.end();
  });
}

(async () => {
  for (const url of urls) {
    const result = await check(url);
    console.log(JSON.stringify(result));
  }
})();
