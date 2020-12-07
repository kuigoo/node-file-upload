import React from 'react'

const baseURL = 'http://localhost:8081'
const chunkSize = 10 * 1024 * 1024

export default function Upload() {
  const createChunkList = (file: File) => {
    let curr = 0
    const chunkList = []
    while (curr < file.size) {
      chunkList.push({ chunk: file.slice(curr, curr + chunkSize) })
      curr += chunkSize
    }
    return chunkList.map(({ chunk }, index) => ({
      chunk,
      hash: file.name + '_' + index,
    }))
  }
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const file = e.target.files[0]
    const chunkList = createChunkList(file)
    await Promise.all(chunkList.map(chunk => {
      const formData = new FormData()
      formData.append('chunk', chunk.chunk)
      formData.append('hash', chunk.hash)
      formData.append('filename', file.name)
      return window.fetch(`${baseURL}/upload`, {
        method: 'POST',
        body: formData
      })
    }))
    window.fetch(`${baseURL}/merge`, {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        size: chunkSize
      })
    })
  }
  return (
    <div className="form">
      <input type="file" name="file" id="file" onChange={handleUpload}/>
      {/* <button onClick={handleUpload}>submit</button> */}
    </div>
  )
}

