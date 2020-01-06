httpProxy = require('http-proxy');

const proxy = httpProxy.createServer({
    target: 'http://localhost:8080'
});
  
proxy.listen(8000);
  
proxy.on('proxyRes', (proxyRes, req, res) => {
    if (req.headers.origin) {
        res.setHeader('access-control-allow-origin', req.headers.origin);
        res.setHeader('access-control-allow-credentials', 'true');
        res.setHeader('access-control-max-age', 60 * 60 * 24 * 30);
    }

    if (req.headers['access-control-request-method']) {
        res.setHeader('access-control-allow-methods', req.headers['access-control-request-method']);
    }

    if (req.headers['access-control-request-headers']) {
        res.setHeader('access-control-allow-headers', req.headers['access-control-request-headers']);
    }

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
    }

});