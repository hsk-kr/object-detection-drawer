import { ObjectDetectionDrawer } from './lib/object-detection-drawer';

const colorset = [
  '#f6e58d',
  '#f9ca24',
  '#7ed6df',
  '#22a6b3',
  '#ffbe76',
  '#f0932b',
  '#e056fd',
  '#be2edd',
  '#ff7979',
  '#eb4d4b',
  '#686de0',
  '#4834d4',
  '#badc58',
  '#6ab04c',
  '#30336b',
  '#130f40',
];

const generateRandomColor = () =>
  colorset[parseInt(Math.random() * colorset.length)];

const polygonTaggedData = [
  {
    pos: [
      [20, 20],
      [150, 260],
      [100, 30],
    ],
    color: generateRandomColor(),
  },
  {
    pos: [
      [160, 140],
      [300, 180],
      [75, 60],
      [60, 70],
    ],
    color: generateRandomColor(),
  },
  {
    pos: [
      [440, 460],
      [500, 400],
      [60, 60],
      [500, 800],
    ],
    color: generateRandomColor(),
  },
];

const rectTaggedData = [
  {
    pos: [500, 500, 550, 550],
    color: generateRandomColor(),
  },
  {
    pos: [150, 150, 280, 290],
    color: generateRandomColor(),
  },
  {
    pos: [70, 70, 120, 120],
    color: generateRandomColor(),
  },
  {
    pos: [140, 140, 200, 200],
    color: generateRandomColor(),
  },
  {
    pos: [0, 50, 50, 100],
    color: generateRandomColor(),
  },
];

function polygonDemoCode() {
  const odDrawer = new ObjectDetectionDrawer(
    'demo',
    ObjectDetectionDrawer.OD_TYPE_POLYGON
  );

  for (const data of polygonTaggedData) {
    odDrawer.appendData(data.pos, data.color);
  }

  odDrawer.update();
}

function rectDemoCode() {
  const odDrawer = new ObjectDetectionDrawer(
    'demo',
    ObjectDetectionDrawer.OD_TYPE_RECT
  );

  for (const data of rectTaggedData) {
    odDrawer.appendData(data.pos, data.color);
  }

  // odDrawer.fillShape(0);
  // setInterval(() => {
  //   odDrawer.update();
  // }, 1000);
  odDrawer.update();
}

function demoCode() {
  rectDemoCode();
  // polygonDemoCode();
}

window.onload = () => {
  demoCode();
};

// const stage = new createjs.Stage('demo');

// const circle = new createjs.Shape();
// circle.graphics.beginFill('red').drawCircle(0, 0, 50, 50);

// console.dir(circle.graphics);
// circle.graphics.beginStroke('red').drawPolygon([20, 20], [60, 60], [20, 60]);

// stage.addChild(circle);

//   setInterval(() => {
//     circle.x += 1;
//     circle.y += 1;
//     stage.update();
//   }, 1);
// }
