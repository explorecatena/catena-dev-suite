const express = require('express')
const http = require('http')
const path = require('path')
const proxy = require('http-proxy-middleware')
const { fork } = require('child_process')
const nunjucks = require('nunjucks')

const libDir = path.resolve(__dirname, 'lib')
const nodeModulesDir = path.resolve(__dirname, 'node_modules')
const staticDir = path.resolve(__dirname, 'static')

const isDev = process.env.NODE_ENV === 'development'
const PORT = process.env.PORT || 8080
let GANACHE_SERVER_PORT = PORT + 1

if (!process.env.RUN_DEV) {
  const ganacheProcess = fork(path.join(libDir, 'ganache/dist/web/main/index.js'), {
    env: { PORT: GANACHE_SERVER_PORT },
    stdio: 'inherit'
  })

  ganacheProcess.on('error', (e) => {
    console.error('ganache process error:', e)
    process.exit(1)
  })
}

const ganacheUrl = `http://localhost:${GANACHE_SERVER_PORT}`
const web3ProviderUrl = 'http://localhost:7545'

const app = express()

nunjucks.configure('views', {
  autoescape: true,
  express: app,
  watch: isDev,
  noCache: isDev
})

app.use((req, res, next) => {
  res.locals.env = req.app.get('env')
  res.locals.req = req
  const lng = req.query.lng || 'en'
  res.locals.lng = lng
  res.locals.nextLng = lng === 'en' ? 'fr' : 'en'
  next()
})

app.use('/static', express.static(staticDir))
app.use('/img', express.static(path.join(staticDir, 'img')))
app.use('/static/vendor/web3', express.static(path.join(nodeModulesDir, 'web3/dist')))

app.use('/remix', express.static(path.join(libDir, 'remix-ide')))
app.use(['/ganache', '/ganache.*.js', '/assets*', '/wss'], proxy({
  target: ganacheUrl,
  ws: true,
  pathRewrite: {
    '^/ganache$': '/'
  },
  changeOrigin: true
}))
app.use('/web3', proxy({
  target: web3ProviderUrl,
  ws: true,
  ignorePath: true,
  changeOrigin: true
}))

app.get('/explorer', (req, res) => res.render('explorer.njk', { iframeSrc: '/ganache' }))
app.get('/editor', (req, res) => res.render('editor.njk', { iframeSrc: '/remix' }))
app.get('/docs', (req, res) => res.render('docs.njk'))
app.get('/', (req, res) => res.render('index.njk'))

const server = http.createServer(app)

server.listen(PORT, () => console.log('Server listening on %d', server.address().port))
