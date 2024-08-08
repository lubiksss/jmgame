const video = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const intervalInput = document.getElementById('interval');
const resetButton = document.getElementById('reset-button');
const boundaryCells = document.querySelectorAll('td[data-cell]');
let net;
let score = 0;
let objectPosition = null;
let objectSpawnTime = 0;
let countdownTime = 0;
let selectedCells = new Set([
  "0-0",
  "0-3",
  "0-2",
  "0-1",
  "1-0",
  "2-0",
  "3-0",
  "4-0",
  "4-1",
  "4-3",
  "4-2",
  "4-4",
  "3-4",
  "2-4",
  "0-4",
  "1-4"
]);

// Mark default selected cells visually
selectedCells.forEach(cellId => {
  const cell = document.querySelector(`td[data-cell="${cellId}"]`);
  if (cell) {
    cell.classList.add('selected');
  }
});

// Generate and display random objects with countdown
function spawnObject() {
  if (selectedCells.size === 0) {
    return;
  }
  const cellArray = Array.from(selectedCells);
  const randomCell = cellArray[Math.floor(Math.random() * cellArray.length)];
  const [row, col] = randomCell.split('-').map(Number);

  const cellWidth = canvas.width / 5;
  const cellHeight = canvas.height / 5;
  const x = col * cellWidth + Math.random() * cellWidth;
  const y = row * cellHeight + Math.random() * cellHeight;

  objectPosition = {x, y};
  objectSpawnTime = Date.now();
  countdownTime = parseInt(intervalInput.value, 10);  // Start countdown from selected interval
}

// Reset the game
function resetGame() {
  score = 0;
  scoreElement.innerText = `Score: ${score}`;
  objectPosition = null;
  spawnObject();
}

// Handle cell selection
boundaryCells.forEach(cell => {
  cell.addEventListener('click', () => {
    const cellId = cell.getAttribute('data-cell');
    if (selectedCells.has(cellId)) {
      selectedCells.delete(cellId);
      cell.classList.remove('selected');
    } else {
      selectedCells.add(cellId);
      cell.classList.add('selected');
    }
    console.log(selectedCells);
  });
});

// Add event listener for reset button
resetButton.addEventListener('click', resetGame);


function setupCamera(video, canvas) {
  setupVideoElement()

  const camera = new Camera(video, {
    onFrame: async () => {
      await net.send({image: video});
    },
    width: 640,
    height: 480
  });
  camera.start();

  video.addEventListener('loadeddata', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  });
}

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function setupVideoElement() {
  if (isMobile()) {
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
  } else {
    video.setAttribute('autoplay', '');
  }
}

function loadPosenet() {
  const pose = new Pose({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
    }
  });

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  return pose
}

function detectKeypoints(keypoints) {
  const selectedPart = document.querySelector('input[name="bodypart"]:checked').value;

  if (keypoints) {
    if (selectedPart === 'hand') {
      return [keypoints[15], keypoints[16], keypoints[17], keypoints[18], keypoints[19], keypoints[20], keypoints[21], keypoints[22]];
    } else if (selectedPart === 'head') {
      return [keypoints[0], keypoints[2], keypoints[5], keypoints[7], keypoints[8], keypoints[9], keypoints[10]];
    } else if (selectedPart === 'foot') {
      return [keypoints[27], keypoints[28], keypoints[29], keypoints[30], keypoints[31], keypoints[32]];
    } else {
      return [];
    }
  }
}

function getPointSize() {
  let bodySize
  const selectedSize = document.querySelector('input[name="bodySize"]:checked').value;

  if (selectedSize === 'small') {
    bodySize = 5;
  } else if (selectedSize === 'medium') {
    bodySize = 25;
  } else if (selectedSize === 'large') {
    bodySize = 50;
  }
  return bodySize
}

function checkTouch(keypointPos, objectPos, size) {
  if (!keypointPos || !objectPos) {
    return false;
  }

  let objectSize;
  if (size === 'small') {
    objectSize = 10;
  } else if (size === 'medium') {
    objectSize = 20;
  } else if (size === 'large') {
    objectSize = 30;
  }
  let bodySize;
  const selectedSize = document.querySelector('input[name="bodySize"]:checked').value;
  if (selectedSize === 'small') {
    bodySize = 10;
  } else if (selectedSize === 'medium') {
    bodySize = 20;
  } else if (selectedSize === 'large') {
    bodySize = 30;
  }

  const distance = Math.sqrt((keypointPos.x - objectPos.x) ** 2 + (keypointPos.y - objectPos.y) ** 2);
  return distance < objectSize + bodySize;
}

function drawObject(ctx, x, y, size) {
  const selectedObjectType = document.querySelector('input[name="objectType"]:checked').value;
  let objectSize;

  if (size === 'small') {
    objectSize = 10;
  } else if (size === 'medium') {
    objectSize = 20;
  } else if (size === 'large') {
    objectSize = 30;
  }

  ctx.fillStyle = 'red';
  ctx.beginPath();

  if (selectedObjectType === 'circle') {
    ctx.arc(x, y, objectSize, 0, 2 * Math.PI);
  } else if (selectedObjectType === 'rectangle') {
    ctx.rect(x - objectSize, y - objectSize, objectSize * 2, objectSize * 2);
  } else if (selectedObjectType === 'triangle') {
    ctx.moveTo(x, y - objectSize);
    ctx.lineTo(x - objectSize, y + objectSize);
    ctx.lineTo(x + objectSize, y + objectSize);
    ctx.closePath();
  }

  ctx.fill();
}

function onResults(results) {
  const filteredKeypoints = detectKeypoints(results.poseLandmarks);

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // Flip the image horizontally
  canvasCtx.scale(-1, 1);
  canvasCtx.translate(-canvasElement.width, 0);

  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00FF00', lineWidth: 4});
  drawLandmarks(canvasCtx, filteredKeypoints, {color: '#FF0000', lineWidth: getPointSize()});

  canvasCtx.restore();

  if (objectPosition) {
    const timeElapsed = (Date.now() - objectSpawnTime) / 1000;
    countdownTime = Math.max(parseInt(intervalInput.value, 10) - timeElapsed, 0).toFixed(1);  // Update countdown

    if (countdownTime > 0) {
      const selectedSize = document.querySelector('input[name="objectSize"]:checked').value;
      drawObject(canvasCtx, objectPosition.x, objectPosition.y, selectedSize);
      canvasCtx.font = '20px Arial';
      canvasCtx.fillStyle = 'white';
      canvasCtx.fillText(countdownTime, objectPosition.x - 10, objectPosition.y + 5);

      // Check for touch
      if (filteredKeypoints) {
        filteredKeypoints.forEach(keypoint => {
          const position = {x: (1 - keypoint.x) * canvasElement.width, y: keypoint.y * canvasElement.height};
          if (checkTouch(position, objectPosition, selectedSize)) {
            score++;
            scoreElement.innerText = `Score: ${score}`;
            objectPosition = null;
          }
        });
      }
    } else {
      objectPosition = null;
    }
  } else {
    spawnObject();
  }


  canvasCtx.restore();
}

async function init() {
  net = loadPosenet();
  setupCamera(video, canvas);

  net.onResults(onResults);
}

init();
