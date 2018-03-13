const express = require('express')
const http = require('http')
const path = require('path')
const proxy = require('http-proxy-middleware')
const { fork } = require('child_process')

const PORT = process.env.PORT || 8080
const GANACHE_PORT = PORT + 1

const libDir = path.resolve(__dirname, 'lib')

const ganacheProcess = fork(path.join(libDir, 'ganache/dist/web/main/index.js'), {
  env: { PORT: GANACHE_PORT },
  stdio: 'inherit'
})

ganacheProcess.on('error', (e) => {
  console.error('ganache process error:', e)
  process.exit(1)
})

const ganacheUrl = `http://localhost:${GANACHE_PORT}`

const app = express()
app.use(['/explorer*', '/assets*', '/wss'], proxy({
  target: ganacheUrl,
  ws: true,
  pathRewrite: {
    '^/explorer$': '/'
  }
}))
app.use('/editor', express.static(path.join(libDir, 'remix-ide')))
app.use('/static', express.static(path.resolve(__dirname, 'static')))
app.use('/img', express.static(path.resolve(__dirname, 'static/img')))
app.use(express.static(path.resolve(__dirname, 'views')))

const server = http.createServer(app)

server.listen(PORT, () => console.log('Server listening on %d', server.address().port))
