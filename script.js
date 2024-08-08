const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
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

// Detect hand positions using PoseNet
async function detectHands() {
  const pose = await net.estimateSinglePose(video, {
    flipHorizontal: true
  });

  return pose.keypoints.filter(point => point.part === 'leftWrist' || point.part === 'rightWrist');
}

// Check if hand touches the object
function checkTouch(handPos, objectPos, radius = 20) {
  if (!handPos || !objectPos) {
    return false;
  }
  const distance = Math.sqrt(
    (handPos.x - objectPos.x) ** 2 +
    (handPos.y - objectPos.y) ** 2
  );
  return distance < radius;
}

// Generate and display random circular objects with countdown
function spawnObject() {
  const x = Math.floor(Math.random() * (canvas.width - 40)) + 20;
  const y = Math.floor(Math.random() * (canvas.height - 40)) + 20;
  objectPosition = { x, y };
  objectSpawnTime = Date.now();
  countdownTime = 3;  // Start countdown from 3 seconds
}

// Main game loop
async function gameLoop() {
  const hands = await detectHands();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the mirrored video feed
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
  ctx.restore();

  // Draw hand positions
  hands.forEach(hand => {
    ctx.beginPath();
    ctx.arc(hand.position.x, hand.position.y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = 'green';
    ctx.fill();
  });

  // Display object with countdown
  if (objectPosition) {
    const timeElapsed = (Date.now() - objectSpawnTime) / 1000;
    countdownTime = Math.max(3 - timeElapsed, 0).toFixed(1);  // Update countdown

    if (countdownTime > 0) {
      ctx.beginPath();
      ctx.arc(objectPosition.x, objectPosition.y, 20, 0, 2 * Math.PI);
      ctx.fillStyle = 'red';
      ctx.fill();
      ctx.font = '20px Arial';
      ctx.fillStyle = 'white';
      ctx.fillText(countdownTime, objectPosition.x - 10, objectPosition.y + 5);

      // Check for touch
      hands.forEach(hand => {
        if (checkTouch(hand.position, objectPosition)) {
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
