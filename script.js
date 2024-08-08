import {setupCamera, loadPosenet, detectKeypoints, checkTouch, drawObject, drawKeypoints} from './utils.js';

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
let selectedCells = new Set(['0-0', '1-1', '2-2']);

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

  const cellWidth = canvas.width / 3;
  const cellHeight = canvas.height / 3;
  const x = col * cellWidth + Math.random() * cellWidth;
  const y = row * cellHeight + Math.random() * cellHeight;

  objectPosition = { x, y };
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

// Main game loop
async function gameLoop() {
  try {
    const keypoints = await detectKeypoints(video, net);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the mirrored video feed
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw keypoint positions
    drawKeypoints(ctx, keypoints);

    // Display object with countdown
    if (objectPosition) {
      const timeElapsed = (Date.now() - objectSpawnTime) / 1000;
      countdownTime = Math.max(parseInt(intervalInput.value, 10) - timeElapsed, 0).toFixed(1);  // Update countdown

      if (countdownTime > 0) {
        const selectedSize = document.querySelector('input[name="objectSize"]:checked').value;
        drawObject(ctx, objectPosition.x, objectPosition.y, selectedSize);
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
  } catch (error) {
    console.error('Error in game loop:', error);
    requestAnimationFrame(gameLoop);
  }
}

// Initialize the game
async function init() {
  await setupCamera(video);
  net = await loadPosenet();
  gameLoop();
}

// Add event listener for reset button
resetButton.addEventListener('click', resetGame);

init();
