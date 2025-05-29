const {
  Engine, Render, Runner, World, Bodies, Mouse, MouseConstraint,
  Constraint, Events
} = Matter;

const engine = Engine.create();
const { world } = engine;

const canvas = document.getElementById('game');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const replayBtn = document.getElementById('replayBtn');

const render = Render.create({
  canvas,
  engine,
  options: {
    width: window.innerWidth,
    height: window.innerHeight,
    wireframes: false,
    background: '#000',  // black background here too
    pixelRatio: window.devicePixelRatio
  }
});

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

let blocks = [];
let balls = [];
let sling;
let ball;
let ground;
let walls = [];
let isGameOver = false;

function getSlingAnchor() {
  return { x: window.innerWidth * 0.25, y: window.innerHeight * 0.6 };
}

function createGround() {
  if (ground) World.remove(world, ground);
  ground = Bodies.rectangle(
    window.innerWidth / 2,
    window.innerHeight - 30,
    window.innerWidth + 100,
    60,
    { isStatic: true, render: { fillStyle: '#060' } }
  );
  World.add(world, ground);
}

function createWalls() {
  if (walls.length) {
    World.remove(world, walls);
    walls = [];
  }
  const thickness = 60;
  const left = Bodies.rectangle(-thickness / 2, window.innerHeight / 2, thickness, window.innerHeight, { isStatic: true, render: { visible: false } });
  const right = Bodies.rectangle(window.innerWidth + thickness / 2, window.innerHeight / 2, thickness, window.innerHeight, { isStatic: true, render: { visible: false } });
  const top = Bodies.rectangle(window.innerWidth / 2, -thickness / 2, window.innerWidth, thickness, { isStatic: true, render: { visible: false } });

  walls = [left, right, top];
  World.add(world, walls);
}

let blockIdCounter = 0;
function createBlock(x, y) {
  const block = Bodies.rectangle(x, y, 40, 40, {
    isStatic: false,
    render: { fillStyle: '#b22' },
    restitution: 0.1,
    friction: 0.4
  });
  block.initialPosition = { x, y };
  block.id = blockIdCounter++;
  block.isHit = false;
  return block;
}

function createBlocks() {
  if (blocks.length) {
    World.remove(world, blocks);
    blocks = [];
  }
  const cols = 5;
  const rows = 4;
  const startX = window.innerWidth * 0.7;
  const startY = window.innerHeight - 100;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      blocks.push(createBlock(startX + x * 40, startY - y * 40));
    }
  }
  World.add(world, blocks);
}

function createBall() {
  const anchor = getSlingAnchor();
  const b = Bodies.circle(anchor.x, anchor.y, 20, {
    density: 0.004,
    restitution: 0.6,
    friction: 0.01,
    render: { fillStyle: '#333' }
  });
  World.add(world, b);
  balls.push(b);
  return b;
}

function createSling(ballBody) {
  if (sling) World.remove(world, sling);
  const anchor = getSlingAnchor();
  sling = Constraint.create({
    pointA: anchor,
    bodyB: ballBody,
    stiffness: 0.02,
    length: 40,
    render: { visible: false }
  });
  World.add(world, sling);
}

function setup() {
  isGameOver = false;
  gameOverOverlay.classList.remove('visible');
  createGround();
  createWalls();
  createBlocks();
  balls.forEach(b => World.remove(world, b));
  balls = [];
  ball = createBall();
  createSling(ball);
}

setup();

const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
  mouse,
  constraint: {
    stiffness: 0.02,
    render: { visible: false }
  }
});
World.add(world, mouseConstraint);
render.mouse = mouse;

Events.on(mouseConstraint, "enddrag", (event) => {
  if (event.body === ball) {
    setTimeout(() => {
      sling.bodyB = null;
    }, 100);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !isGameOver) {
    ball = createBall();
    createSling(ball);
  }
});

Events.on(engine, 'collisionStart', event => {
  event.pairs.forEach(pair => {
    const { bodyA, bodyB } = pair;
    [bodyA, bodyB].forEach(body => {
      if (blocks.includes(body)) {
        let otherBody = (body === bodyA) ? bodyB : bodyA;
        if (balls.includes(otherBody)) {
          body.isHit = true;
        }
      }
    });
  });
});

Events.on(render, 'beforeRender', () => {
  blocks.forEach(block => {
    block.render.fillStyle = block.isHit ? '#f90' : '#b22';
  });

  if (!isGameOver) {
    const allHit = blocks.every(block => block.isHit);
    if (allHit) {
      isGameOver = true;
      gameOverOverlay.classList.add('visible');
    }
  }
});

Events.on(render, 'afterRender', () => {
  const ctx = render.context;
  if (sling.bodyB) {
    const posA = sling.pointA;
    const posB = sling.bodyB.position;

    ctx.beginPath();
    ctx.moveTo(posA.x, posA.y);
    ctx.lineTo(posB.x, posB.y);
    ctx.strokeStyle = '#fff';  // white sling string
    ctx.lineWidth = 5;
    ctx.stroke();
  }
});

replayBtn.addEventListener('click', () => {
  setup();
});

window.addEventListener('resize', () => {
  render.bounds.max.x = window.innerWidth;
  render.bounds.max.y = window.innerHeight;
  render.options.width = window.innerWidth;
  render.options.height = window.innerHeight;
  render.canvas.width = window.innerWidth * window.devicePixelRatio;
  render.canvas.height = window.innerHeight * window.devicePixelRatio;
  render.canvas.style.width = window.innerWidth + 'px';
  render.canvas.style.height = window.innerHeight + 'px';

  createGround();
  createWalls();
  createBlocks();

  if (ball && sling) {
    sling.pointA = getSlingAnchor();
    if (!sling.bodyB) {
      createSling(ball);
    }
  }
});
