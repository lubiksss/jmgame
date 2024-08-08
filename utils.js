export async function setupCamera(video) {
  setupVideoElement()

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

export async function loadPosenet() {
  return await posenet.load();
}

export async function detectKeypoints(video, net) {
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

export function checkTouch(keypointPos, objectPos, size) {
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

export function drawObject(ctx, x, y, size) {
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

export function drawKeypoints(ctx, keypoints) {
  let bodySize
  const selectedSize = document.querySelector('input[name="bodySize"]:checked').value;

  if (selectedSize === 'small') {
    bodySize = 10;
  } else if (selectedSize === 'medium') {
    bodySize = 20;
  } else if (selectedSize === 'large') {
    bodySize = 30;
  }

  // Draw keypoint positions
  keypoints.forEach(keypoint => {
    ctx.beginPath();
    ctx.arc(keypoint.position.x, keypoint.position.y, bodySize, 0, 2 * Math.PI);
    ctx.fillStyle = 'green';
    ctx.fill();
  });
}
