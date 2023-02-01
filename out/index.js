// https://github.com/ffmpegwasm/ffmpeg.wasm

// handlers 

const fileUpload = document.getElementById('file-upload')
const video = document.getElementById('video')
const videoOverlay = document.getElementById('video-overlay')
const timestampForm = document.getElementById('timestamp-form')
const timestampList = document.getElementById('timestamp-list')
const startInput = document.getElementById('start')
const endInput = document.getElementById('end')
const addBtn = document.getElementById('add')
const clearBtn = document.getElementById('clear')
const exportBtn = document.getElementById('export')

let uploadedFile = null
let inFilename = ''
const redBgStyle = 'background-color: rgba(240, 128, 128, 0.5);'
const timestamps = []
const removeBtnsAndHandlers = []

exportBtn.addEventListener('click', exportVideo, false)
clearBtn.addEventListener('click', clearForm, false)
fileUpload.addEventListener('change', loadSelectedVideo, false)
timestampForm.addEventListener('submit', handleTimestampSubmit, false)
video.addEventListener('timeupdate', () => {
  let showOverlay = false
  for(let i = 0; i < timestamps.length; i++) {
    if (
      video.currentTime >= timestamps[i].start &&
      video.currentTime <= timestamps[i].end) {
      showOverlay = true
      break
    }
  }
  if (showOverlay && !videoOverlay.hasAttribute('style')) {
    videoOverlay.setAttribute('style', redBgStyle)
  } else if (!showOverlay && videoOverlay.hasAttribute('style')) {
    videoOverlay.removeAttribute('style')
  }
}, false)

async function exportVideo() {
  try {
    exportBtn.disabled = true
    exportBtn.classList.add('disabled')
    if (!uploadedFile) {
      window.alert('No file selected')
      return
    }
    if (timestamps.length === 0) {
      window.alert('No timestamps added')
      return
    }
    if (!ffmpeg.isLoaded()) {
      await ffmpeg.load();
    }
    ffmpeg.FS('writeFile', inFilename, await fetchFile(uploadedFile));
    const outFilename = 'out.mp4';
    const args = [
      '-i',
      inFilename,
      '-filter_complex',
      '[0:v]trim=start=00.000:end=10.000[av];[0:v]trim=start=20.000:end=30.000,setpts=PTS-STARTPTS[bv];[0:v]trim=start=40.000:end=50.000,setpts=PTS-STARTPTS[dv];[0:a]atrim=start=00.000:end=10.000[aa];[0:a]atrim=start=20.000:end=30.000,asetpts=PTS-STARTPTS[ba];[0:a]atrim=start=40.000:end=50.000,asetpts=PTS-STARTPTS[da];[av][bv]concat[cv];[aa][ba]concat=v=0:a=1[ca];[cv][dv]concat[outv];[ca][da]concat=v=0:a=1[outa]',
      '-map',
      '[outv]',
      '-map',
      '[outa]',
      outFilename,
    ]
    await ffmpeg.run(...args);
  
    const data = ffmpeg.FS('readFile', outFilename);
    video.src = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }))
  } catch(e) {
    window.alert('could not export video')
    console.log('why god', e)
  } finally {
    exportBtn.disabled = false
    exportBtn.classList.remove('disabled')
  }
}

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
  exportBtn.disabled = false
  exportBtn.classList.remove('disabled')
  
  clearForm()
}

function cleanUpTimestamps() {
  timestamps.splice(0, timestamps.length)
  removeBtnsAndHandlers.forEach(({ remove, btn }) => {
    btn.removeEventListener('click', remove)
  })
  removeBtnsAndHandlers.splice(0, removeBtnsAndHandlers.length)
  timestampList.innerHTML = ''
  exportBtn.disabled = true
  exportBtn.classList.add('disabled')
}

function loadSelectedVideo(event) {
  const file = event.target.files[0]
  inFilename = file.name

  readFromBlobOrFile(file)
    .then((result) => {
      uploadedFile = new Uint8Array(result)
    })
  
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

function readFromBlobOrFile(blob) {
  return (
    new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        resolve(fileReader.result);
      };
      fileReader.onerror = ({ target: { error: { code } } }) => {
        reject(Error(`File could not be read! Code=${code}`));
      };
      fileReader.readAsArrayBuffer(blob);
    })
  )
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

    if (timestamps.length === 0) {
      exportBtn.disabled = true
      exportBtn.classList.add('disabled')
    }
  }

  removeBtnsAndHandlers.push({
    remove,
    btn: removeBtn,
  })
  
  return li
}

