const express = require('express');
const app = express();

app.use((_, res, next) => {
  res.header('Cross-Origin-Opener-Policy', 'same-origin');
  res.header('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

app.use(express.static('out'));

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});

// https://stackoverflow.com/questions/60361177/ffmpeg-trim-combine-multiple-sections-of-same-video-with-precise-timestamps