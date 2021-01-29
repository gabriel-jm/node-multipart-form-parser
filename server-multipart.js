const http = require('http')

const server = http.createServer((req, res) => {
  const boundary = req.headers['content-type'].split('; boundary=')[1]

  let body = []

  req.on('data', chunk => {
    body = [...body, chunk]
  })

  req.on('end', () => {
    const buffer = Buffer.concat(body)
    body = buffer.toString()

    const value = {}

    body
      .split(`--${boundary}`)
      .forEach(item => {
        if(item.includes('filename')) {
          const match = item.match(
            /\r\nContent-Disposition: form-data; name="(?<key>.+)"; filename="(?<name>.+)"\r\nContent-Type: (?<type>.+)\r\n\r\n/
          )

          const [mathText] = match
          let startIndex = null
          let data = null
          const fieldTextLength = Buffer.from(mathText).length

          for(let b=0; b <= buffer.length; b++) {
            if(startIndex) {
              const subBuf = buffer.slice(b, b + boundary.length + 2)

              if(subBuf.toString() === `--${boundary}`) {
                data = buffer.subarray(startIndex, b)
                break
              }
            }

            if(!startIndex) {
              const end = b + fieldTextLength
              const subBuf = buffer.slice(b, end)
              
              if(subBuf.toString() === mathText) {
                startIndex = end
              }
            }
          }
          
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
            const { groups } = match

            value[groups.key] = groups.value
          }
        }
      })
    ;

    body = value

    res.writeHead(200, { 'Content-Type': 'image/jpg' })
    res.end(body.file.data)
  })

})

server.listen(3100, () => {
  console.clear()
  console.log('Server on - port 3100')
})
