import * as createjs from '@createjs/easeljs';

/**
 * Default values of the modes
 */
const defaultModeInfo = {
  srtPos: undefined, // started at [x, y]
  movePos: undefined, // current cursor are at [x, y]
  endPos: undefined, // ended at [x, y]
  dragRect: undefined, // A rect shape,
  draggedShapes: [],
};

const generateDefaultModeInfo = () => ({ ...defaultModeInfo });

/**
 * Define drawPolygon
 */

/**
 * Draw Polygon
 * @param {[x, y][]} posList Position List
 */
createjs.Graphics.prototype.drawPolygon = function (...posList) {
  const copyPosList = [...posList];
  if (copyPosList.length === 0) return this;
  const firstPos = copyPosList.splice(0, 1)[0];
  let chain = this.moveTo(firstPos[0], firstPos[1]);
  for (const pos of copyPosList) chain = chain.lineTo(pos[0], pos[1]);
  return chain.lineTo(firstPos[0], firstPos[1]);
};

/**
 * -----
 */

export class ObjectDetectionDrawer {
  // ObjectDetectionDrawer Rendering Types
  static OD_TYPE_RECT = 1;
  static OD_TYPE_POLYGON = 2;
  // ObjectDetectionDrawer Type
  static OD_MODE_DEFAULT = 1;
  // Constants
  static EMPTY_AREA_COLOR = '#00000002';
  static DEFAULT_MODE_LINE_COLOR = '#ffffff';
  static LABEL_HEIGHT = 20;

  // Private Member Variables
  _canvas = undefined;
  _stage = undefined;
  _image = undefined;
  _mode = undefined; // It uses for canvas mouse events. like drawing a shape, drag and select shapes.
  _mousePos = undefined; // [x, y]
  _movable = 0; // 0: not movable 1: ready to change movable 2: movable
  _scale = 1.0;
  _moveStartingPoint = undefined; // undefined | [x, y]
  _prevStagePos = undefined; // Stage position before moving
  _defaultModeInfo = generateDefaultModeInfo(); // Data of default mode. It has to be changed when the mode is changed.
  _dataList = [];
  _preventGlobalMouseEvent = false; // It uses for preventing global mouse events

  /**
   * Shapes
   * {
   *   tagArea: Shape
   * }
   */
  _shapesList = [];

  // Public Member Variables
  cursorPointer = true; // Whather change the cursor to the pointer or not when cursor on shapes.

  /**
    Callback Events
  */
  onShapeMouseOver = (data, shapes) => {};
  onShapeMouseOut = (data, shapes) => {};
  onShapeClick = (data, shapes) => {};

  /**
   * It fires when dragging ended on the default mode.
   * you can remove a rag box by calling the remove function.
   * @param {{ srtPos: [x, y], movePos: [x, y], endPos: [x, y], dragRect: Shape, draggedShapes: [], clear: () => void) }} e e: { srtPos: [x, y], movePos: [x, y], endPos: [x, y], dragRect: Shape, clear: () => void) }
   */
  onDefaultDraggingEnd = (e) => {};

  /**
   * Constructor
   * @param {string} canvasId Canvas Element Id
   * @param {string} imgPath Target Image Path
   */
  constructor(canvasId, imgPath) {
    this._canvas = document.getElementById(canvasId);
    this._stage = new createjs.Stage(canvasId);
    this._imgPath = imgPath;

    this._init();
  }

  /** Initialize */
  _init() {
    this._stage.enableMouseOver(10);
    this._loadImg();
    this._addCanvasEvents();

    this._mode = ObjectDetectionDrawer.OD_MODE_DEFAULT;
  }

  _loadImg() {
    if (this._imgPath.trim().length === 0) return;

    this._image = new Image();
    this._image.src = this._imgPath;
    this._image.onload = () => {
      const bitmap = new createjs.Bitmap(this._image);
      this._stage.addChild(bitmap);
      this._stage.setChildIndex(bitmap, 0);
      this._stage.update();
    };
  }

  // Update Cursor depends on the _movable variable.
  _updateMovableCursor() {
    const currentCursor = document.body.style.cursor.replace('default', '');

    switch (this._movable) {
      case 0:
        if (currentCursor !== '') document.body.style.cursor = '';
        break;
      case 1:
        if (currentCursor === '') document.body.style.cursor = 'grab';
        break;
    }
  }

  /**
   * Attach Events to the canvas and window.
   */
  _addCanvasEvents() {
    // Helpers

    // Dragging End Event
    const endDragging = (mouseX, mouseY) => {
      switch (this._mode) {
        case ObjectDetectionDrawer.OD_MODE_DEFAULT:
          if (this._defaultModeInfo.srtPos === undefined) return;

          this._defaultModeInfo.endPos = [mouseX, mouseY];
          this.onDefaultDraggingEnd({
            ...this._defaultModeInfo,
            clear: this._clearDefaultModeInfo.bind(this),
          });
          break;
        default:
          break;
      }
    };

    /** Calculates mouse position proportional to the stage scale and position. */
    const calcMosePos = (e) => {
      let xToSet = e.rawX - this._stage.x;
      let yToSet = e.rawY - this._stage.y;

      xToSet = xToSet / this._stage.scale;
      yToSet = yToSet / this._stage.scale;

      return [xToSet, yToSet];
    };

    // Mouse Wheel Zoom Events
    this._canvas.addEventListener('wheel', (e) => {
      if (e.deltaY < 0) {
        this.expandCanvasScale(0.25);
      } else if (e.deltaY > 0) {
        this.reduceCanvasScale(0.25);
      }
    });

    // Mouse Events and Keyboard Events for moving canvas position
    document.addEventListener('keydown', (e) => {
      if (document.activeElement.tagName.toLowerCase() === 'input') return; // When input is focused, It doesn't fire

      switch (e.key.toLowerCase()) {
        case ' ':
          if (this._movable === 0) {
            this._movable = 1;

            this._updateMovableCursor();
          }
          break;
      }
    });

    // Keyboard Events for moving canvas position
    document.addEventListener('keyup', (e) => {
      switch (e.key.toLowerCase()) {
        case ' ':
          if (this._movable !== 0) {
            this._movable = 0;
            this._updateMovableCursor();
          }
          break;
      }
    });

    this._stage.on('stagemousedown', (e) => {
      const [mouseX, mouseY] = calcMosePos(e);

      // Do something depends on the mode
      switch (this._mode) {
        case ObjectDetectionDrawer.OD_MODE_DEFAULT:
          this._defaultModeInfo.srtPos = [mouseX, mouseY]; // Save a starting point
          this._defaultModeInfo.dragRect = this._createDefaultModeDragRect(
            this._defaultModeInfo.srtPos
          ); // Create a rect
          this._stage.addChild(this._defaultModeInfo.dragRect);
          break;
        default:
          break;
      }
    });

    this._stage.on('stagemousemove', (e) => {
      if (this._preventGlobalMouseEvent) {
        this._preventGlobalMouseEvent = false;
        this._clearDefaultModeInfo();
        return;
      } // When mouse is clicked on a shape, It makes the event ended.

      const [mouseX, mouseY] = calcMosePos(e);

      // Do something depends on the mode
      switch (this._mode) {
        case ObjectDetectionDrawer.OD_MODE_DEFAULT:
          if (
            this._defaultModeInfo.srtPos === undefined ||
            this._defaultModeInfo.dragRect === undefined ||
            this._defaultModeInfo.endPos !== undefined
          )
            return;

          // Resize A Drawing Rectangle
          this._defaultModeInfo.movePos = [mouseX, mouseY];
          {
            let x, y, w, h;

            if (mouseX > this._defaultModeInfo.srtPos[0]) {
              x = this._defaultModeInfo.srtPos[0];
              w = mouseX - x;
            } else {
              x = mouseX;
              w = this._defaultModeInfo.srtPos[0] - x;
            }

            if (mouseY > this._defaultModeInfo.srtPos[1]) {
              y = this._defaultModeInfo.srtPos[1];
              h = mouseY - y;
            } else {
              y = mouseY;
              h = this._defaultModeInfo.srtPos[1] - y;
            }

            this._defaultModeInfo.dragRect.graphics.command.x = x;
            this._defaultModeInfo.dragRect.graphics.command.y = y;
            this._defaultModeInfo.dragRect.graphics.command.w = w;
            this._defaultModeInfo.dragRect.graphics.command.h = h;
          }

          this.update();
          break;
        default:
          break;
      }
    });

    this._stage.on('stagemouseup', (e) => {
      const [mouseX, mouseY] = calcMosePos(e);
      endDragging(mouseX, mouseY);
    });

    this._stage.on('stagemouseout', (e) => {
      const [mouseX, mouseY] = calcMosePos(e);
      endDragging(mouseX, mouseY);
    });

    this._canvas.addEventListener('mousedown', (e) => {
      const { x: canvasX, y: canvasY } = this._canvas.getBoundingClientRect();
      const [mouseX, mouseY] = [e.clientX - canvasX, e.clientY - canvasY];

      // The image repositioning
      if (this._movable === 1) {
        this._prevStagePos = [this._stage.x, this._stage.y];
        this._moveStartingPoint = [mouseX, mouseY];
        this._movable = 2;
      }
    });

    this._canvas.addEventListener('mousemove', (e) => {
      // The image repositioning
      const { x: canvasX, y: canvasY } = this._canvas.getBoundingClientRect();
      this._mousePos = [e.clientX - canvasX, e.clientY - canvasY];
      const [mouseX, mouseY] = this._mousePos;

      if (this._movable === 2) {
        const [setX, setY] = [
          mouseX - this._moveStartingPoint[0],
          mouseY - this._moveStartingPoint[1],
        ];

        this._stage.x = this._prevStagePos[0] + setX;
        this._stage.y = this._prevStagePos[1] + setY;
        this.adjustPos();
      }
    });

    window.document.addEventListener('mouseup', (e) => {
      // The image repositioning
      if (this._movable === 2) {
        this._moveStartingPoint = undefined;
        this._movable = 1;

        this._updateMovableCursor();
      }
    });
  }

  /** Re-init this._defaultModeInfo */
  _clearDefaultModeInfo() {
    if (this._defaultModeInfo.dragRect !== undefined) {
      this._stage.removeChild(this._defaultModeInfo.dragRect);
      this.update();
    }
    this._defaultModeInfo = generateDefaultModeInfo();
  }

  /**
   * Removes the shapes in the stage.
   * @param {any} shapes A Shape
   */
  _removeShapesInStage(shapes) {
    this._stage.removeChild(shapes.tagArea);
    this._stage.removeChild(shapes.labelBackground);
    this._stage.removeChild(shapes.labelText);
  }

  /**
   * Calculates where label position will be
   * @param {number} type OD_TYPE_POLYGON | OD_TYPE_RECT
   * @param {number[] | [x,y][]} pos Positions
   * @returns {[x, y]}
   */
  _calcLabelPos(type, pos) {
    let labelPos = [];

    if (type === ObjectDetectionDrawer.OD_TYPE_RECT) {
      labelPos = [pos[0], pos[1] - ObjectDetectionDrawer.LABEL_HEIGHT];
    } else {
      labelPos = pos.reduce((l, r) => {
        let minX = 0;
        let minY = 0;

        if (l[0] < r[0]) minX = l[0];
        else minX = r[0];
        if (l[1] < r[1]) minY = l[1];
        else minY = r[1];

        return [minX, minY];
      });
      labelPos[1] -= ObjectDetectionDrawer.LABEL_HEIGHT;
    }

    return labelPos;
  }

  /**
   * Creates createjs.Text
   * @param {string} labelText Label Text
   * @param {[x, y]} pos [x, y]
   * @returns {createjs.Text} createjs.Text
   */
  _createLabelText(labelText, pos) {
    let newLabelText = ' ';
    if (labelText.trim().length !== 0) newLabelText = labelText;
    const text = new createjs.Text(newLabelText, '12px Arial', '#ffffff');
    text.x = pos[0] + 4;
    text.y = pos[1] + 4;
    return text;
  }

  /**
   * Creates createjs.Shape
   * @param {createjs.Text} text
   * @param {[x, y]} pos [x, y]
   * returns {createjs.Shape} createjs.Shape
   */
  _createLabelBackground(text, pos) {
    const labelBackground = new createjs.Shape();
    const { width: textWidth } = text.getBounds();
    labelBackground.graphics
      .beginFill('#000')
      .drawRect(
        pos[0],
        pos[1],
        textWidth + 8,
        ObjectDetectionDrawer.LABEL_HEIGHT
      );

    return labelBackground;
  }

  _createPointShapes(posList) {
    const type = typeof posList[0] === 'object' ? 'polygon' : 'rect';
    const pointShapes = [];

    if (type === 'polygon') {
      for (const pos of posList) {
        const point = new createjs.Shape();
        point.graphics.beginFill('#000').drawCircle(pos[0], pos[1], 5);
        pointShapes.push(point);
      }
    } else {
      console.log(posList);
      const ltPoint = new createjs.Shape();
      const rtPoint = new createjs.Shape();
      const lbPoint = new createjs.Shape();
      const rbPoint = new createjs.Shape();

      ltPoint.graphics
        .beginStroke('#000')
        .setStrokeStyle(2)
        .beginFill('#fff')
        .drawCircle(posList[0], posList[1], 5);
      lbPoint.graphics
        .beginStroke('#000')
        .setStrokeStyle(2)
        .beginFill('#fff')
        .drawCircle(posList[2], posList[1], 5);
      rtPoint.graphics
        .beginStroke('#000')
        .setStrokeStyle(2)
        .beginFill('#fff')
        .drawCircle(posList[0], posList[3], 5);
      rbPoint.graphics
        .beginStroke('#000')
        .setStrokeStyle(2)
        .beginFill('#fff')
        .drawCircle(posList[2], posList[3], 5);

      pointShapes.push(ltPoint);
      pointShapes.push(rtPoint);
      pointShapes.push(lbPoint);
      pointShapes.push(rbPoint);
    }

    // Attach events to the points.
    for (const point of pointShapes) {
      point.on('mouseover', () => {
        document.body.style.cursor = 'move';
      });

      point.on('mouseout', () => {
        document.body.style.cursor = document.body.style.cursor.replace(
          'move',
          ''
        );
      });

      point.on('mousedown', () => {
        this._preventGlobalMouseEvent = true;
      });
    }

    return pointShapes;
  }

  _createLabelShapes(labelText, pos) {
    return this._createLabelText(labelText, pos);
  }

  /**
   * Creates a rectangle that drawn by mouse drag. (on default mode)
   * It returns null if the srtPos format is incorrect.
   * @parma srtPos {[number, number]}
   */
  _createDefaultModeDragRect(srtPos) {
    if (srtPos?.length !== 2) return;
    const dragRect = new createjs.Shape();
    dragRect.graphics
      .setStrokeStyle(2)
      .beginStroke(ObjectDetectionDrawer.DEFAULT_MODE_LINE_COLOR)
      .beginFill(ObjectDetectionDrawer.EMPTY_AREA_COLOR) // Without it the mouse events wouldn't work
      .drawRect(srtPos[0], srtPos[1], 0, 0);
    return dragRect;
  }

  /**
   * Scales the stage. It uses mouse position(It'd be set in canvas mousemove event.) for scaling pivot.
   * @param {number} scale Scale to set
   */
  setScale(scale) {
    //! These codes have to be changed. It's not done yet.
    const [mouseX, mouseY] = this._mousePos;
    const [pivotX, pivotY] = [
      mouseX / this._canvas.width,
      mouseY / this._canvas.height,
    ];

    // Scales
    if (this._scale < scale) {
      const widthWeight =
        this._image.width * scale - this._image.width * this._scale;
      const heightWeight =
        this._image.height * scale - this._image.height * this._scale;

      this._stage.x -= widthWeight * pivotX;
      this._stage.y -= heightWeight * pivotY;
    } else {
      // const widthWeight =
      //   this._image.width * this._scale - this._image.width * scale;
      // const heightWeight =
      //   this._image.height * this._scale - this._image.height * scale;
      // this._stage.x += widthWeight * pivotX;
      // this._stage.y += heightWeight * pivotY;
    }

    console.log(this._image.width * this._scale * pivotX);

    // Sets scale variables
    this._scale = scale;
    this._stage.scaleX = scale;
    this._stage.scaleY = scale;
  }

  /** Adjust Position related to canvas and image size */
  adjustPos() {
    const [imageWidth, imageHeight] = [
      this._image.width * this._scale,
      this._image.height * this._scale,
    ];

    if (imageWidth <= this._canvas.width) {
      if (this._stage.x < 0) this._stage.x = 0;
      if (this._stage.x + imageWidth >= this._canvas.width)
        this._stage.x = this._canvas.width - imageWidth;
    } else {
      if (this._stage.x > 0) this._stage.x = 0;
      if (this._stage.x + imageWidth <= this._canvas.width)
        this._stage.x = this._canvas.width - imageWidth;
    }

    if (imageHeight <= this._canvas.height) {
      if (this._stage.y < 0) this._stage.y = 0;
      if (this._stage.y + imageHeight >= this._canvas.height)
        this._stage.y = this._canvas.height - imageHeight;
    } else {
      if (this._stage.y > 0) this._stage.y = 0;
      if (this._stage.y + imageHeight <= this._canvas.height)
        this._stage.y = this._canvas.height - imageHeight;
    }

    this._stage.update();
  }

  expandCanvasScale(scale) {
    // Sets scale
    const newScale = this._scale + scale;
    if (newScale > 16) return;
    this.setScale(newScale);
    this.adjustPos();
  }

  reduceCanvasScale(scale) {
    // Sets scale
    const newScale = this._scale - scale;
    if (newScale < scale) return;
    this.setScale(newScale);
    this.adjustPos();
  }

  /**
   * If you don't have the data and the shape, you can use the index of the shapes list.
   * @param {number | data} paramA Data Index or Data
   * @param {Shapes} paramB (Optional)
   */
  selectTagArea(paramA, paramB) {
    let data = undefined;
    let shapes = undefined;

    if (paramB !== undefined) {
      data = paramA;
      shapes = paramB;
    } else {
      data = this._dataList[paramA];
      shapes = this._shapesList[paramA];
    }

    data.selected = true;
    this.fillTagArea(data, shapes);

    // Create resizing points and render them
    const points = this._createPointShapes(data.pos);
    shapes.points = points;
    for (const point of points) {
      this._stage.addChild(point);
    }

    this.update();
  }

  /**
   * Fills color inside the data shape by index and update the variable 'isFilled' to true.
   * If you don't have the data and the shape, you can use the index of the shapes list.
   * @param {number | data} paramA Data Index or Data
   * @param {Shapes} paramB (Optional)
   */
  fillTagArea(paramA, paramB) {
    let data = undefined;
    let shapes = undefined;

    if (paramB !== undefined) {
      data = paramA;
      shapes = paramB;
    } else {
      data = this._dataList[paramA];
      shapes = this._shapesList[paramA];
    }

    const { color, isFilled } = data;
    const { tagArea } = shapes;
    const tagAreaGraphics = tagArea.graphics;

    if (!isFilled) {
      tagAreaGraphics._fill.style = color + '20';
    }

    data.isFilled = true;
    return tagAreaGraphics;
  }

  /**
   * Unfills the data shape by index and update the varaible 'isFilled' to false.
   * If you don't have the data and the shape, you can use the index of the shapes list.
   * @param {number | data} paramA Data Index or Data
   * @param {Shapes} paramB Shapes (Optional)
   */
  unfillTagArea(paramA, paramB) {
    let data = undefined;
    let shapes = undefined;

    if (paramB !== undefined) {
      data = paramA;
      shapes = paramB;
    } else {
      data = this._dataList[paramA];
      shapes = this._shapesList[paramA];
    }

    const { tagArea } = shapes;
    const tagAreaGraphics = tagArea.graphics;

    if (data.isFilled) {
      tagAreaGraphics._fill.style = ObjectDetectionDrawer.EMPTY_AREA_COLOR;
    }

    data.isFilled = false;
    return tagAreaGraphics;
  }

  /**
   * Sets label visible
   * @param {boolean} visible
   * @param {number | data} paramA Data Index or Data
   * @param {Shapes} paramB Shapes (Optional)
   */
  setLabelVisible(visible, paramA, paramB) {
    let data = undefined;
    let shapes = undefined;

    if (paramB !== undefined) {
      data = paramA;
      shapes = paramB;
    } else {
      data = this._dataList[paramA];
      shapes = this._shapesList[paramA];
    }

    if (visible) {
      this._stage.addChild(shapes.labelBackground);
      this._stage.addChild(shapes.labelText);
    } else {
      this._stage.removeChild(shapes.labelBackground);
      this._stage.removeChild(shapes.labelText);
    }
  }

  /**
   * Sets label text
   * @param {string} label Label Text
   * @param {number | data} paramA Data Index or Data
   * @param {Shapes} paramB Shapes (Optional)
   */
  setLabelText(label, paramA, paramB) {
    let data = undefined;
    let shapes = undefined;

    if (paramB !== undefined) {
      data = paramA;
      shapes = paramB;
    } else {
      data = this._dataList[paramA];
      shapes = this._shapesList[paramA];
    }

    // Removes label text and label shape
    this._stage.removeChild(shapes.labelText);
    this._stage.removeChild(shapes.labelBackground);

    // Re-create label text and label shape
    const labelPos = this._calcLabelPos(data.type, data.pos);
    shapes.labelText = this._createLabelText(label, labelPos);
    shapes.labelBackground = this._createLabelBackground(
      shapes.labelText,
      labelPos
    );

    // Add them to children of the stage
    this._stage.addChild(shapes.labelBackground);
    this._stage.addChild(shapes.labelText);
  }

  /**
   * Appends data to the data list.
   * @param {number} type OD_TYPE_POLYGON | OD_TYPE_RECT
   * @param {number[] | [x, y][]} pos Positions
   * @param {string} color Hex RGB string, ('#000000', '#ffbbaa' ...)
   * @param {string} label Label Text
   */
  appendData(type, pos, color, label = '') {
    const newData = { pos, color, isFilled: false, selected: false };
    const newShapes = {};

    // Create tag area shape
    newShapes.tagArea = new createjs.Shape();

    // Draw TagArea
    if (type === ObjectDetectionDrawer.OD_TYPE_RECT) {
      newShapes.tagArea.graphics
        .setStrokeStyle(2)
        .beginStroke(color)
        .beginFill(ObjectDetectionDrawer.EMPTY_AREA_COLOR) // Without it the mouse events wouldn't work
        .drawRect(pos[0], pos[1], pos[2] - pos[0], pos[3] - pos[1]);
    } else {
      newShapes.tagArea.graphics
        .setStrokeStyle(2)
        .beginStroke(color)
        .beginFill(ObjectDetectionDrawer.EMPTY_AREA_COLOR) // Without it the mouse events wouldn't work
        .drawPolygon(...pos);
    }

    // Attaches mouse events to the shape
    newShapes.tagArea.on('mousedown', () => {
      this._preventGlobalMouseEvent = true;
    });

    newShapes.tagArea.addEventListener('click', () => {
      this.onShapeClick(newData, newShapes);
    });

    newShapes.tagArea.addEventListener('mouseover', () => {
      if (this.onShapeMouseOver) this.onShapeMouseOver(newData, newShapes);
      if (this.cursorPointer && this._movable === 0) {
        document.body.style.setProperty('cursor', 'pointer');
      }
      this._stage.update();
    });

    newShapes.tagArea.addEventListener('mouseout', () => {
      if (this.onShapeMouseLeave) this.onShapeMouseLeave(newData, newShapes);
      if (this.cursorPointer && this._movable === 0) {
        document.body.style.setProperty('cursor', 'default');
      }
      this._stage.update();
    });

    // Creates Label and LabelBackground
    const labelPos = this._calcLabelPos(type, pos);
    newShapes.labelText = this._createLabelText(label, labelPos);
    newShapes.labelBackground = this._createLabelBackground(
      newShapes.labelText,
      labelPos
    );

    // Adds the shapes to the stage
    this._stage.addChild(newShapes.tagArea);

    // Adds data to lists
    this._dataList.push(newData);
    this._shapesList.push(newShapes);
  }

  /**
   * Deletes data by index
   * @param {number} index
   */
  removeDataByIndex(index) {
    // Remove Shapes
    _removeShapesInStage(this._shapesList[index]);

    this._dataList.splice(index, 1);
    this._shapesList.splice(index, 1);
  }

  /** Returns Data */
  getDataList() {
    return this._dataList;
  }

  /**
   * Sets Data
   * @param {{ pos: number[], color: string, isFilled: false }[]} dataList
   */
  setDataList(dataList) {
    this._dataList = dataList;
  }

  /** Render Shapes */
  update() {
    this._stage.update();
  }
}
