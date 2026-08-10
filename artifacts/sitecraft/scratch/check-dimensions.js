import fs from 'fs';

function getJpegSize(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    let i = 0;
    if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
      return { error: 'Not a valid JPEG file' };
    }
    i += 2;
    while (i < buffer.length) {
      if (buffer[i] === 0xFF && buffer[i+1] === 0xC0) {
        const height = buffer.readUInt16BE(i + 5);
        const width = buffer.readUInt16BE(i + 7);
        return { width, height };
      }
      i++;
    }
    return { error: 'SOF0 marker not found' };
  } catch (e) {
    return { error: e.message };
  }
}

console.log('scene_track Frame 1:', getJpegSize('/Users/durveshnarkhede/Downloads/Credit-Analyzer/artifacts/sitecraft/public/cinematic/scene_track/videoplayback_001.jpg'));
console.log('scene_1 Frame 1:', getJpegSize('/Users/durveshnarkhede/Downloads/Credit-Analyzer/artifacts/sitecraft/public/cinematic/scene_1/videoplayback_001.jpg'));
