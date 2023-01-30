// https://github.com/ffmpegwasm/ffmpeg.wasm

// handlers 

const fileUpload = document.getElementById('file-upload')
const video = document.getElementById('video')

fileUpload.addEventListener('change', loadSelectedVideo, false)

function loadSelectedVideo(event) {
  const file = event.target.files[0]
  if (!video.canPlayType(file.type)) {
    window.alert('Cannot play this file')
    return
  }
  const fileURL = URL.createObjectURL(file)
  video.src = fileURL
}

