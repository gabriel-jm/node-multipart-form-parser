const http = require('http')
const busboy = require('busboy')

const fileFieldRegex = /\r\nContent-Disposition: form-data; name="(?<key>.+)"; filename="(?<name>.+)"\r\nContent-Type: (?<type>.+)\r\n\r\n/

const server = http.createServer((req, res) => {
  const boundaryText = req.headers['content-type'].split('; boundary=')[1]
  const boundary = `--${boundaryText}`

  if (req.url === '/busboy') {
    const busboyParser = busboy({ headers: req.headers })
    
    const finalBody = {}

    busboyParser
      .on('file', (name, file, info) => {
        const { filename, encoding, mimeType } = info

        file.on('data', data => {
          const currentData = Reflect.get(finalBody, name)

          if (!currentData) {
            Reflect.set(finalBody, name, {
              filename,
              encoding,
              mimeType,
              data
            })
          } else {
            Reflect.set(currentData, 'data', Buffer.concat([
              currentData.data,
              data
            ]))
          }
        })
      })
      .on('field', (name, value) => {
        Reflect.set(finalBody, name, value)
      })
      .on('finish', () => {
        res.writeHead(200, { 'Content-Type': finalBody.file.mimeType })
        res.end(finalBody.file.data)
      })

    req.pipe(busboyParser)
  } else {
    let body = []

    req.on('data', chunk => {
      body = [...body, chunk]
    })

    req.on('end', () => {
      const fullBodyBuffer = Buffer.concat(body)
      body = fullBodyBuffer.toString('latin1')

      let currentBufferIndex = boundary.length

      const value = {}

      for (const item of body.split(`--${boundary}`)) {
        if(item.includes('filename')) {
          const match = item.match(fileFieldRegex)

          const [matchText] = match
          const fieldTextLength = matchText.length

          const startIndex = currentBufferIndex + fieldTextLength
          const data = fullBodyBuffer.subarray(startIndex, startIndex + item.length)

          currentBufferIndex += startIndex + boundary.length
          const { groups } = match

          value[groups.key] = {
            name: groups.name,
            type: groups.type,
            data
          }
        } else {
          const match = item.match(
            /\r\nContent-Disposition: form-data; name="(?<key>.+)"\r\n\r\n(?<value>.+)/
          )

          if(match) {
            const { groups, input } = match
            currentBufferIndex += (input.length + boundary.length)

            value[groups.key] = groups.value
          }
        }
      }

      body = value

      res.writeHead(200, { 'Content-Type': body.file.type })
      res.end(body.file.data)
    })
  }
})

server.listen(3100, () => {
  console.clear()
  console.log('Server on - port 3100')
})
