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

const alphabet = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z']

function getSegmentCode(i, type) {
  return new Array(Math.floor(i / alphabet.length) + 1).fill(alphabet[i % alphabet.length]).join('') + type
}

function getVideoSegmentStr({ start, end, index }) {
  return `[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS[${getSegmentCode(index, 'v')}]`
}

function getAudioSegmentStr({ start, end, index }) {
  return `[0:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS[${getSegmentCode(index, 'a')}]`
}

function getFilterStrFromSegments(segments) {
  const { video, audio } = segments.reduce((acc, {start, end}, index) => {
    return {
      video: acc.video.concat(getVideoSegmentStr({ start, end, index })),
      audio: acc.audio.concat(getAudioSegmentStr({ start, end, index })),
    }
  }, { video: [], audio: [] })
  
  return video.join(';').concat(audio.join(';'))
}

function concatSegmentCodes(code1, code2, type) {
  return code1.slice(0, code1.length - 1) + code2.slice(0, code2.length - 1) + type
}

function getConcatStr(segmentsLength) {
  if (segmentsLength < 2) {
    return {
      concatStr: '',
      concatVideoStr: 'av',
      concatAudioStr: 'aa',
    }
  }

  let concatStrArr = [
    '[av][bv]concat[abv]',
    '[aa][ba]concat=v=0:a=1[aba]',
  ]

  let concatVideoStr = 'abv'
  let concatAudioStr = 'aba'

  for(let i = 2; i < segmentsLength; i += 1) {
    const nextVideoSegmentCode = getSegmentCode(i, 'v')
    const nextConcatVideoStr = i < segmentsLength - 1
      ? concatSegmentCodes(concatVideoStr, nextVideoSegmentCode, 'v')
      : 'outv'

    const nextAudioSegmentCode = getSegmentCode(i, 'a')
    const nextConcatAudioStr = i < segmentsLength - 1
      ? concatSegmentCodes(concatAudioStr, nextAudioSegmentCode, 'a')
      : 'outa'

    concatStrArr = concatStrArr.concat(
      `[${concatVideoStr}][${nextVideoSegmentCode}]concat[${nextConcatVideoStr}]`,
      `[${concatAudioStr}][${nextAudioSegmentCode}]concat=v=0:a=1[${nextConcatAudioStr}]`,
      )
    
    concatVideoStr = nextConcatVideoStr
    concatAudioStr = nextConcatAudioStr
  }
  return {
    concatStr: concatStrArr.join(';'),
    concatVideoStr,
    concatAudioStr,
  }
}

function getSegments(timestamps) {
  const segments = []
  let lastTime = 0
  for(let i = 0; i < timestamps.length; i++) {
    const { start: tsStart, end: tsEnd } = timestamps[i]
    if (tsStart > 0) {
      segments.push({
        start: lastTime,
        end: tsStart,
      })
    }
    if (i < timestamps.length - 1) {
      lastTime = tsEnd
    } else if (tsEnd < video.duration) {
      segments.push({
        start: tsEnd,
        end: video.duration,
      })
    }
  }
  return segments
}

function getComplexFFmpegArgs() {
  const segments = getSegments(timestamps)
  const filterStr = getFilterStrFromSegments(segments)
  const { concatStr, concatVideoStr, concatAudioStr } = getConcatStr(segments.length)
  return [
    `${filterStr};${concatStr}`,
    '-map',
    `[${concatVideoStr}]`,
    '-map',
    `[${concatAudioStr}]`,
  ]
}

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
      ...getComplexFFmpegArgs(),
      outFilename,
    ]
    await ffmpeg.run(...args);
  
    const data = ffmpeg.FS('readFile', outFilename);
    video.src = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }))
  } catch(e) {
    window.alert('could not export video')
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
  
  // prevent overlapping timestamps
  for(let i = 0; i < timestamps.length; i++) {
    if (start >= timestamps[i].start && start <= timestamps[i].end) {
      window.alert('Start time overlaps with another timestamp')
      return
    }

    if (end >= timestamps[i].start && end <= timestamps[i].end) {
      window.alert('End time overlaps with another timestamp')
      return
    }
  }
  
  if (start > video.duration || end > video.duration) {
    window.alert('Timestamps must be within video duration')
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

