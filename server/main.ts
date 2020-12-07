import http = require('http')
import fs = require('fs-extra')
import path = require('path')
import qs = require('querystring')
import multiparty = require('multiparty')

const UPLOAD_DIR = path.resolve(__dirname, '..', 'static')

const server = http.createServer()
server.listen(8081)
server.on('request', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')

  if (req.method === 'OPTIONS') {
    res.status = 200
    res.end()
    return
  }

  if (req.url === '/upload') {
    const multipart = new multiparty.Form()
    multipart.parse(req, async (err, fields, files) => {
      if (err) return
      const [chunk] = files.chunk
      const [hash] = fields.hash
      const [filename] = fields.filename
      const chunkDir = path.resolve(UPLOAD_DIR, filename);

      if (!fs.existsSync(chunkDir)) {
        await fs.mkdirs(chunkDir)
      }
      await fs.move(chunk.path, `${chunkDir}/${hash}`);
      res.end('received chunk!')
    })
  } else if (req.url === '/merge') {
    const { filename, size } = await resolvePost<{ filename: string, size: number }>(req)
    const filePath = path.resolve(__dirname, '../dest', filename)
    await mergeFileChunk(filePath, filename, size)

    res.end(JSON.stringify({
      code: 200,
      success: true
    }))
  }

})

function resolvePost<T extends object>(req: http.IncomingMessage): Promise<T> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
    })
    req.on('end', () => {
      resolve(JSON.parse(body))
    })
  })
}

async function mergeFileChunk(filePath: string, filename: string, size: number) {
  const chunkDir = path.resolve(UPLOAD_DIR, filename)
  const chunkList = await fs.readdir(chunkDir)
  // @ts-ignore
  chunkList.sort((a, b) => a.split('-')[1] - b.split('-')[1])
  await Promise.all(
    chunkList.map((chunkPath: string, index: number) => {
      return new Promise((resolve) => {
        const readStream = fs.createReadStream(path.resolve(chunkDir, chunkPath))
        const writeStream = fs.createWriteStream(filePath, {
          start: index * size,
        })
        readStream.on('end', () => {
          fs.unlinkSync(path.resolve(chunkDir, chunkPath));
          resolve(true)
        });
        readStream.pipe(writeStream);
      })
    })
  )
  fs.rmdirSync(chunkDir)
}
