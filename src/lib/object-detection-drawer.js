import * as createjs from '@createjs/easeljs';

/**
 * Define drawPolygon
 */

/**
 * Draw Polygon
 * @param {[x, y][]} posList Position List
 */
createjs.Graphics.prototype.drawPolygon = function (posList) {
  if (posList.length === 0) return this;
  const firstPos = posList.splice(0, 1)[0];
  let chain = this.moveTo(firstPos[0], firstPos[1]);
  for (const pos of posList) chain = chain.lineTo(pos[0], pos[1]);
  return chain.lineTo(firstPos[0], firstPos[1]);
};

/**
 * -----
 */

export class ObjectDetectionDrawer {
  // ObjectDetectionDrawer Render Types
  static OD_TYPE_RECT = 1;
  static OD_TYPE_POLYGON = 2;
  static EMPTY_AREA_COLOR = '#00000002';
  static LABEL_HEIGHT = 20;

  // Private Member Variables
  _canvas = undefined;
  _stage = undefined;
  _type = undefined;
  _image = undefined;
  _mousePos = undefined; // [x, y]
  _movable = 0; // 0: not movable 1: ready to change movable 2: movable
  _scale = 1.0;
  _moveStartingPoint = undefined; // undefined | [x, y]
  _prevStagePos = undefined; // Stage position before moving
  _dataList = [];
  /**
   * Shapes
   * {
   *   tagArea: Shape
   * }
   */
  _shapesList = [];

  // Public Member Variables
  cursorPointer = true; // Whather change the cursor to the pointer or not when cursor on shapes.

  // Events
  onShapeMouseOver = (data, shapes) => {};
  onShapeMouseOut = (data, shapes) => {};

  /**
   * Constructor
   * @param {string} canvasId Canvas Element Id
   * @param {number} type OD_TYPE_RECT | OD_TYPE_POLYGON
   * @param {string} imgPath Target Image Path
   */
  constructor(canvasId, type, imgPath) {
    this._canvas = document.getElementById(canvasId);
    this._stage = new createjs.Stage(canvasId);
    this._type = type;
    this._imgPath = imgPath;

    this._init();
  }

  /** Initialize */
  _init() {
    this._stage.enableMouseOver(10);
    this._loadImg();
    this._addCanvasEvents();
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
        break;
    }
  }

  _addCanvasEvents() {
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

    this._canvas.addEventListener('mousedown', (e) => {
      if (this._movable === 1) {
        this._prevStagePos = [this._stage.x, this._stage.y];
        this._moveStartingPoint = [e.clientX, e.clientY];
        this._movable = 2;
      }
    });

    this._canvas.addEventListener('mousemove', (e) => {
      this._mousePos = [e.clientX, e.clientY];

      if (this._movable === 2) {
        const [mouseX, mouseY] = this._mousePos;
        const [setX, setY] = [
          mouseX - this._moveStartingPoint[0],
          mouseY - this._moveStartingPoint[1],
        ];

        this._stage.x = this._prevStagePos[0] + setX;
        this._stage.y = this._prevStagePos[1] + setY;
        this.adjustPos();
      }
    });

    window.document.addEventListener('mouseup', () => {
      if (this._movable === 2) {
        this._moveStartingPoint = undefined;
        this._movable = 1;

        this._updateMovableCursor();
      }
    });
  }

  _removeShapesInStage(shapes) {
    this._stage.removeChild(shapes.tagArea);
    this._stage.removeChild(shapes.labelBackground);
    this._stage.removeChild(shapes.labelText);
  }

  /**
   * Calculates where label position will be
   * @param {number[] | [x,y][]} pos Positions
   * @returns {[x, y]}
   */
  _calcLabelPos(pos) {
    let labelPos = [];

    if (this._type === ObjectDetectionDrawer.OD_TYPE_RECT) {
      labelPos = [pos[0], pos[1] - ObjectDetectionDrawer.LABEL_HEIGHT];
    } else {
      labelPos = pos.reduce((l, r) => {
        let minX = (minY = 0);

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
   * @returns {createjs.Text}
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
   * @returns {createjs.Shape}
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

  _createLabelShapes(labelText, pos) {
    return this._createLabelText(labelText);
  }

  /**
   * Scales the stage. It uses mouse position(It'd be set in canvas mousemove event.) for scaling pivot.
   * @param {number} scale Scale to set
   */
  setScale(scale) {
    this._scale = scale;
    this._stage.scaleX = scale;
    this._stage.scaleY = scale;

    const [mouseX, mouseY] = this._mousePos;
    const [pivotX, pivotY] = [
      mouseX / this._canvas.width,
      mouseY / this._canvas.height,
    ];
    console.log(pivotX, pivotY);
  }

  /** Adjust Position related to canvas and image size */
  adjustPos() {
    const isImageSmallerThanCanvas =
      this._image.width * this._scale <= this._canvas.width &&
      this._image.height * this._scale <= this._canvas.height;

    if (isImageSmallerThanCanvas) {
      const [imageWidth, imageHeight] = [
        this._image.width * this._scale,
        this._image.height * this._scale,
      ];

      if (this._stage.x < 0) this._stage.x = 0;
      if (this._stage.y < 0) this._stage.y = 0;
      if (this._stage.x + imageWidth >= this._canvas.width)
        this._stage.x = this._canvas.width - imageWidth;
      if (this._stage.y + imageHeight >= this._canvas.height)
        this._stage.y = this._canvas.height - imageHeight;
    } else {
      const [imageWidth, imageHeight] = [
        this._image.width * this._scale,
        this._image.height * this._scale,
      ];

      if (this._stage.x > 0) this._stage.x = 0;
      if (this._stage.y > 0) this._stage.y = 0;
      if (this._stage.x + imageWidth <= this._canvas.width)
        this._stage.x = this._canvas.width - imageWidth;
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
   * Fills color to the data shape by index and update the variable 'isFilled' to true.
   * If you don't have the data and the shape, you can use the index of lists.
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

    const { pos, color, isFilled } = data;
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
   * If you don't have the data and the shape, you can use the index of lists.
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
    const labelPos = this._calcLabelPos(data.pos);
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
   * @param {number[] | [x, y][]} pos Positions
   * @param {string} color Hex RGB string, ('#000000', '#ffbbaa' ...)
   * @param {string} label Label Text
   */
  appendData(pos, color, label = '') {
    const newData = { pos, color, isFilled: false };
    const newShapes = {};

    // Create tag area shape
    newShapes.tagArea = new createjs.Shape();

    // Draw TagArea
    if (this._type === ObjectDetectionDrawer.OD_TYPE_RECT) {
      newShapes.tagArea.graphics
        .setStrokeStyle(2)
        .beginStroke(color)
        .beginFill(ObjectDetectionDrawer.EMPTY_AREA_COLOR) // Without it mouse events wouldn't work
        .drawRect(pos[0], pos[1], pos[2] - pos[0], pos[3] - pos[1]);
    } else {
      newShapes.tagArea.graphics
        .setStrokeStyle(2)
        .beginStroke(color)
        .beginFill(ObjectDetectionDrawer.EMPTY_AREA_COLOR) // Without it mouse events wouldn't work
        .drawPolygon(pos);
    }

    // Attaches mouse events to the shape
    newShapes.tagArea.addEventListener('mouseover', () => {
      if (this.onShapeMouseOver) this.onShapeMouseOver(newData, newShapes);
      if (this.cursorPointer && this._movable === 0) {
        document.body.style.setProperty('cursor', 'pointer');
      }
      this.fillTagArea(newData, newShapes);
      this._stage.update();
    });

    newShapes.tagArea.addEventListener('mouseout', () => {
      if (this.onShapeMouseLeave) this.onShapeMouseLeave(newData, newShapes);
      if (this.cursorPointer && this._movable === 0) {
        document.body.style.setProperty('cursor', 'default');
      }
      this.unfillTagArea(newData, newShapes);
      this._stage.update();
    });

    // Creates Label and LabelBackground
    const labelPos = this._calcLabelPos(pos);
    newShapes.labelText = this._createLabelText(label, labelPos);
    newShapes.labelBackground = this._createLabelBackground(
      newShapes.labelText,
      labelPos
    );

    // Adds the shapes to the stage
    this._stage.addChild(newShapes.tagArea);
    this._stage.addChild(newShapes.labelBackground);
    this._stage.addChild(newShapes.labelText);

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
