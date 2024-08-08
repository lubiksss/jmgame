const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const intervalInput = document.getElementById('interval');
const resetButton = document.getElementById('reset-button');
const boundaryCells = document.querySelectorAll('td[data-cell]');
let net;
let score = 0;
let objectPosition = null;
let objectSpawnTime = 0;
let countdownTime = 0;
let selectedCells = new Set();

// Setup camera
async function setupCamera() {
  video.width = 640;
  video.height = 480;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: true
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

// Load the PoseNet model
async function loadPosenet() {
  net = await posenet.load();
}

// Detect keypoints using PoseNet based on the selected body part
async function detectKeypoints() {
  const pose = await net.estimateSinglePose(video, {
    flipHorizontal: true
  });

  const selectedPart = document.querySelector('input[name="bodypart"]:checked').value;

  if (selectedPart === 'hand') {
    return pose.keypoints.filter(point => point.part === 'leftWrist' || point.part === 'rightWrist');
  } else if (selectedPart === 'head') {
    return pose.keypoints.filter(point => point.part === 'nose' || point.part === 'leftEye' || point.part === 'rightEye');
  } else if (selectedPart === 'foot') {
    return pose.keypoints.filter(point => point.part === 'leftAnkle' || point.part === 'rightAnkle');
  } else {
    return [];
  }
}

// Check if a keypoint touches the object
function checkTouch(keypointPos, objectPos, size, radius = 20) {
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

  const distance = Math.sqrt(
    (keypointPos.x - objectPos.x) ** 2 +
    (keypointPos.y - objectPos.y) ** 2
  );
  return distance < objectSize;
}

// Generate and display random objects with countdown
function spawnObject() {
  if (selectedCells.size === 0) {
    return;
  }
  const cellArray = Array.from(selectedCells);
  const randomCell = cellArray[Math.floor(Math.random() * cellArray.length)];
  const [row, col] = randomCell.split('-').map(Number);

  const cellWidth = canvas.width / 3;
  const cellHeight = canvas.height / 3;
  const x = col * cellWidth + Math.random() * cellWidth;
  const y = row * cellHeight + Math.random() * cellHeight;

  objectPosition = { x, y };
  objectSpawnTime = Date.now();
  countdownTime = parseInt(intervalInput.value, 10);  // Start countdown from selected interval
}

// Draw the selected object type
function drawObject(x, y, size) {
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
  });
});

// Main game loop
async function gameLoop() {
  const keypoints = await detectKeypoints();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the mirrored video feed
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
  ctx.restore();

  // Draw keypoint positions
  keypoints.forEach(keypoint => {
    ctx.beginPath();
    ctx.arc(keypoint.position.x, keypoint.position.y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = 'green';
    ctx.fill();
  });

  // Display object with countdown
  if (objectPosition) {
    const timeElapsed = (Date.now() - objectSpawnTime) / 1000;
    countdownTime = Math.max(parseInt(intervalInput.value, 10) - timeElapsed, 0).toFixed(1);  // Update countdown

    if (countdownTime > 0) {
      const selectedSize = document.querySelector('input[name="objectSize"]:checked').value;
      drawObject(objectPosition.x, objectPosition.y, selectedSize);
      ctx.font = '20px Arial';
      ctx.fillStyle = 'white';
      ctx.fillText(countdownTime, objectPosition.x - 10, objectPosition.y + 5);

      // Check for touch
      keypoints.forEach(keypoint => {
        if (checkTouch(keypoint.position, objectPosition, selectedSize)) {
          score++;
          scoreElement.innerText = `Score: ${score}`;
          objectPosition = null;
        }
      });
    } else {
      objectPosition = null;
    }
  } else {
    spawnObject();
  }

  requestAnimationFrame(gameLoop);
}

// Initialize the game
async function init() {
  await setupCamera();
  await loadPosenet();
  gameLoop();
}

// Add event listener for reset button
resetButton.addEventListener('click', resetGame);

init();
