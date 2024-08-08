const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const intervalInput = document.getElementById('interval');
let net;
let score = 0;
let objectPosition = null;
let objectSpawnTime = 0;
let countdownTime = 0;

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
function checkTouch(keypointPos, objectPos, radius = 20) {
  if (!keypointPos || !objectPos) {
    return false;
  }
  const distance = Math.sqrt(
    (keypointPos.x - objectPos.x) ** 2 +
    (keypointPos.y - objectPos.y) ** 2
  );
  return distance < radius;
}

// Generate and display random circular objects with countdown
function spawnObject() {
  const x = Math.floor(Math.random() * (canvas.width - 40)) + 20;
  const y = Math.floor(Math.random() * (canvas.height - 40)) + 20;
  objectPosition = { x, y };
  objectSpawnTime = Date.now();
  countdownTime = parseInt(intervalInput.value, 10);  // Start countdown from selected interval
}

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
      ctx.beginPath();
      ctx.arc(objectPosition.x, objectPosition.y, 20, 0, 2 * Math.PI);
      ctx.fillStyle = 'red';
      ctx.fill();
      ctx.font = '20px Arial';
      ctx.fillStyle = 'white';
      ctx.fillText(countdownTime, objectPosition.x - 10, objectPosition.y + 5);

      // Check for touch
      keypoints.forEach(keypoint => {
        if (checkTouch(keypoint.position, objectPosition)) {
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

init();
