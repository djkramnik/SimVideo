// https://github.com/ffmpegwasm/ffmpeg.wasm

// handlers 

const fileUpload = document.getElementById('file-upload')
const video = document.getElementById('video')
const timestampForm = document.getElementById('timestamp-form')
const clearBtn = document.getElementById('clear')
const timestamps = []

clearBtn.addEventListener('click', clearForm, false)
fileUpload.addEventListener('change', loadSelectedVideo, false)
timestampForm.addEventListener('submit', handleTimestampSubmit, false)

function clearForm() {
  timestampForm.querySelector('input[name="start"]').value = ''
  timestampForm.querySelector('input[name="end"]').value = ''
}

function handleTimestampSubmit(event) {
  event.preventDefault()
  const formData = new FormData(event.target)
  const start = Number(formData.get('start'))
  const end = Number(formData.get('end'))
  if (Number.isNaN(start) || Number.isNaN(end)) {
    window.alert('Invalid timestamp')
    return
  }
  if (start >= end) {
    window.alert('Start must be less than end')
    return
  }
  timestamps.push({ start, end })
  console.log('timestamps', timestamps)
  clearForm()
}

function loadSelectedVideo(event) {
  const file = event.target.files[0]
  if (!video.canPlayType(file.type)) {
    window.alert('Cannot play this file')
    return
  }
  const fileURL = URL.createObjectURL(file)
  video.src = fileURL
}

