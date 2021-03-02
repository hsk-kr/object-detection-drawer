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

const taggedData = [
  {
    type: ObjectDetectionDrawer.OD_TYPE_POLYGON,
    pos: [
      [20, 20],
      [150, 260],
      [100, 30],
    ],
    color: generateRandomColor(),
    label: 'test A',
  },
  {
    type: ObjectDetectionDrawer.OD_TYPE_POLYGON,
    pos: [
      [160, 140],
      [300, 180],
      [75, 60],
      [60, 70],
    ],
    color: generateRandomColor(),
    label: 'test B',
  },
  {
    type: ObjectDetectionDrawer.OD_TYPE_POLYGON,
    pos: [
      [440, 460],
      [500, 400],
      [60, 60],
      [500, 800],
    ],
    color: generateRandomColor(),
    label: 'test C',
  },
  {
    type: ObjectDetectionDrawer.OD_TYPE_RECT,
    pos: [500, 500, 550, 550],
    color: generateRandomColor(),
    label: 'test D',
  },
  {
    type: ObjectDetectionDrawer.OD_TYPE_RECT,
    pos: [150, 150, 280, 290],
    color: generateRandomColor(),
    label: 'test E',
  },
  {
    type: ObjectDetectionDrawer.OD_TYPE_RECT,
    pos: [70, 70, 120, 120],
    color: generateRandomColor(),
    label: 'test F',
  },
  {
    type: ObjectDetectionDrawer.OD_TYPE_RECT,
    pos: [140, 140, 200, 200],
    color: generateRandomColor(),
    label: 'test G',
  },
  {
    type: ObjectDetectionDrawer.OD_TYPE_RECT,
    pos: [0, 50, 50, 100],
    color: generateRandomColor(),
    label: 'test H',
  },
];

function demoCode() {
  const odDrawer = new ObjectDetectionDrawer('demo', './res/sample.jpg');

  for (const data of taggedData) {
    1;
    odDrawer.appendData(data.type, data.pos, data.color, data.label);
  }

  // odDrawer.fillShape(0);
  // setInterval(() => {
  //   odDrawer.update();
  // }, 1000);
  odDrawer.update();

  document.getElementById('btnExpand').addEventListener('click', () => {
    odDrawer.expandCanvasScale(0.25);
  });

  document.getElementById('btnReduce').addEventListener('click', () => {
    odDrawer.reduceCanvasScale(0.25);
  });
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
