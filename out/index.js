// https://github.com/ffmpegwasm/ffmpeg.wasm

// handlers 

const fileUpload = document.getElementById('file-upload')
const video = document.getElementById('video')
const timestampForm = document.getElementById('timestamp-form')
const timestampList = document.getElementById('timestamp-list')
const startInput = document.getElementById('start')
const endInput = document.getElementById('end')
const addBtn = document.getElementById('add')
const clearBtn = document.getElementById('clear')

const timestamps = []
const removeBtnsAndHandlers = []

clearBtn.addEventListener('click', clearForm, false)
fileUpload.addEventListener('change', loadSelectedVideo, false)
timestampForm.addEventListener('submit', handleTimestampSubmit, false)

function addToTimestamps({start, end}) {
  const timestamp = { start, end, id: Date.now() }
  // insert into timestamps based on order of start time
  const index = timestamps.findIndex(t => t.start > start)

  if (index === -1) {
    timestamps.push(timestamp)
  }
  else {
    timestamps.splice(index, 0, timestamp)
  }
  return {
    timestamp,
    index,
  }
}

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
  const { timestamp, index } = addToTimestamps({ start, end })
  const dom = createTimestampDom(timestamp)
  if (index === -1) {
    timestampList.appendChild(dom)
  } else {
    timestampList.insertBefore(
      dom,
      timestampList.children[index],
    )
  }
  
  console.log('timestamps', timestamps)
  clearForm()
}

function cleanUpTimestamps() {
  timestamps.splice(0, timestamps.length)
  removeBtnsAndHandlers.forEach(({ remove, btn }) => {
    btn.removeEventListener('click', remove)
  })
  removeBtnsAndHandlers.splice(0, removeBtnsAndHandlers.length)
  timestampList.innerHTML = ''
}

function loadSelectedVideo(event) {
  const file = event.target.files[0]
  if (!video.canPlayType(file.type)) {
    window.alert('Cannot play this file')
    return
  }
  const fileURL = URL.createObjectURL(file)
  video.src = fileURL

  // enable the form
  startInput.disabled = false
  endInput.disabled = false
  clearBtn.disabled = false
  addBtn.disabled = false
  clearBtn.classList.remove('disabled')
  addBtn.classList.remove('disabled')

  // clear the timestamps
  if (timestamps.length > 0) {
    cleanUpTimestamps()
  }
}

function createTimestampDom(timestamp) {
  const {start, end, id} = timestamp
  
  const li = document.createElement('li')
  const content = document.createElement('div')
  li.appendChild(content)
  content.classList.add('flex', 'gap-15', 'aic', 'pv-4')
  const startTime = document.createElement('span')
  startTime.classList.add('inline-block', 'bold', 'minw-80')
  startTime.innerText = `Start: ${start}`
  const endTime = document.createElement('span')
  endTime.classList.add('inline-block', 'bold', 'minw-80')
  endTime.innerText = `End: ${end}`
  const removeBtn = document.createElement('button')
  removeBtn.classList.add('button', 'secondary', 'secondary-hover')
  removeBtn.innerText = 'Remove'
  content.appendChild(startTime)
  content.appendChild(endTime)
  content.appendChild(removeBtn)
  
  removeBtn.addEventListener('click', remove)

  function remove() {
    li.remove()
    timestamps.splice(timestamps.findIndex(t => t.id === id), 1)
    removeBtn.removeEventListener('click', remove)
    removeBtnsAndHandlers.splice(removeBtnsAndHandlers.findIndex(r => r.btn === removeBtn), 1)
    console.log('timestamps', timestamps)
  }

  removeBtnsAndHandlers.push({
    remove,
    btn: removeBtn,
  })
  
  return li
}

