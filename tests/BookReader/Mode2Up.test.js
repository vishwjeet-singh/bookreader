import '../../src/js/jquery-ui-wrapper.js';
import 'jquery.browser';
import '../../src/js/dragscrollable-br.js';
import 'jquery-colorbox';

import sinon from 'sinon';
import { deepCopy } from '../utils.js';
import BookReader from '../../src/js/BookReader.js';
/** @typedef {import('../../src/js/BookReader/options.js').BookReaderOptions} BookReaderOptions */

beforeAll(() => {
  global.alert = jest.fn();
})
afterEach(() => {
  jest.restoreAllMocks();
  sinon.restore();
});

/** @type {BookReaderOptions['data']} */
const SAMPLE_DATA = [
  [
    { width: 123, height: 123, uri: 'https://archive.org/image0.jpg', pageNum: '1' },
  ],
  [
    { width: 123, height: 123, uri: 'https://archive.org/image1.jpg', pageNum: '2' },
    { width: 123, height: 123, uri: 'https://archive.org/image2.jpg', pageNum: '3' },
  ],
  [
    { width: 123, height: 123, uri: 'https://archive.org/image3.jpg', pageNum: '4' },
    { width: 123, height: 123, uri: 'https://archive.org/image4.jpg', pageNum: '5' },
  ],
  [
    { width: 123, height: 123, uri: 'https://archive.org/image5.jpg', pageNum: '6' },
  ],
];


describe('zoom', () => {
  const br = new BookReader({ data: SAMPLE_DATA });
  br.init();

  const stopAnim = sinon.spy(br, 'stopFlipAnimations');
  const resizeSpread = sinon.spy(br._modes.mode2Up, 'resizeSpread');
  br._modes.mode2Up.zoom('in');

  test('stops animations when zooming', () => {
    expect(stopAnim.callCount).toBe(1);
  });
  test('always redraws when zooming', () => {
    expect(resizeSpread.callCount).toBe(0);
  });
});

describe('prefetch', () => {
  test('loads nearby pages', () => {
    const br = new BookReader({ data: SAMPLE_DATA });
    br.init();
    const spy = sinon.spy(br, 'prefetchImg');
    br.prefetch();
    expect(spy.callCount).toBeGreaterThan(2);
  });

  test('works when at start of book', () => {
    const br = new BookReader({ data: SAMPLE_DATA });
    br.init();
    br.jumpToIndex(-1);
    const spy = sinon.spy(br, 'prefetchImg');
    br.prefetch();
    expect(spy.callCount).toBeGreaterThan(2);
  });

  test('works when at end of book', () => {
    const br = new BookReader({ data: SAMPLE_DATA });
    br.init();
    br.jumpToIndex(SAMPLE_DATA.flat().length - 1);
    const spy = sinon.spy(br, 'prefetchImg');
    br.prefetch();
    expect(spy.callCount).toBeGreaterThan(2);
  });


  test('skips consecutive unviewables', () => {
    const data = deepCopy(SAMPLE_DATA);
    data[1].forEach(page => page.viewable = false);
    const br = new BookReader({ data });
    br.init();
    br.prefetch();
    expect(br.prefetchedImgs).not.toContain(2);
  });
});

describe('draw 2up leaves', () => {
  test('calls `drawLeafs` on init as default', () => {
    const br = new BookReader({ data: SAMPLE_DATA });
    const drawLeafs = sinon.spy(br._modes.mode2Up, 'drawLeafs');

    br.init();
    expect(drawLeafs.callCount).toBe(1);
  })

  test('sets `this.displayedIndices`', () => {
    const extremelyWrongValueForDisplayedIndices = null;
    const br = new BookReader({ data: SAMPLE_DATA });

    br.init();
    br.displayedIndices = extremelyWrongValueForDisplayedIndices;
    expect(br.displayedIndices).toBe(extremelyWrongValueForDisplayedIndices);

    br._modes.mode2Up.drawLeafs();

    expect(br.displayedIndices).not.toBe(extremelyWrongValueForDisplayedIndices);
    expect(br.displayedIndices.length).toBe(2); // is array
    expect(br.displayedIndices).toEqual([-1, 0]); // default to starting index on right, placeholder for left
  })
});

describe('shouldRedrawSpread', () => {
  test('returns FALSE if current images are larger && if pages in view are prefetched', () => {
    const br = new BookReader({ data: SAMPLE_DATA });
    br.init();
    const reduceStub = 10;
    br.reduce = reduceStub;
    br._modes.mode2Up.getIdealSpreadSize = () => { return { reduce: 11 }};
    const shouldRedrawSpread = br._modes.mode2Up.shouldRedrawSpread;
    expect(shouldRedrawSpread).toBe(false);
  });
  test('returns TRUE if current images are smaller && if pages in view are prefetched', () => {
    const br = new BookReader({ data: SAMPLE_DATA });
    br.init();
    const reduceStub = 11;
    br.reduce = reduceStub;
    br._modes.mode2Up.getIdealSpreadSize = () => { return { reduce: 10 }};
    const shouldRedrawSpread = br._modes.mode2Up.shouldRedrawSpread;
    expect(shouldRedrawSpread).toBe(true);
  });
});

describe('resizeSpread', () => {
  test('only resizes spread', () => {
    const br = new BookReader({ data: SAMPLE_DATA });
    br.init();
    const resizeBRcontainer = sinon.spy(br, 'resizeBRcontainer');
    const calculateSpreadSize = sinon.spy(br._modes.mode2Up, 'calculateSpreadSize');
    const drawLeafs = sinon.spy(br._modes.mode2Up, 'drawLeafs');
    const centerView = sinon.spy(br._modes.mode2Up, 'centerView');

    br._modes.mode2Up.resizeSpread();
    expect(drawLeafs.callCount).toBe(0);  // no draw
    expect(resizeBRcontainer.callCount).toBe(1);
    expect(calculateSpreadSize.callCount).toBe(1);
    expect(centerView.callCount).toBe(1);
  });
});

describe('2up Container sizing', () => {
  test('baseLeafCss', () => {
    const br = new BookReader({ data: SAMPLE_DATA });
    br.init();
    br.calculateSpreadSize();
    expect(Object.keys(br._modes.mode2Up.baseLeafCss)).toEqual(['position', 'right', 'top', 'zIndex']);
  });
  test('heightCss', () => {
    const br = new BookReader({ data: SAMPLE_DATA });
    br.init();
    br.calculateSpreadSize();
    const heightStub = 1000;
    br.twoPage.height = heightStub;
    expect(Object.keys(br._modes.mode2Up.heightCss)).toEqual(['height']);
    expect(br._modes.mode2Up.heightCss).toEqual({height: `${heightStub}px`});
  });
  describe('left side', () => {
    const br = new BookReader({ data: SAMPLE_DATA });
    br.init();
    br.calculateSpreadSize();

    test('leftLeafCss', () => {
      expect(Object.keys(br._modes.mode2Up.leftLeafCss)).toEqual([
        'position',
        'right',
        'top',
        'zIndex',
        'height',
        'left',
        'width',
      ]);
    });
    test('leafEdgeLCss', () => {
      expect(Object.keys(br._modes.mode2Up.leafEdgeLCss)).toEqual([
        'height',
        'width',
        'left',
        'top',
        'border'
      ]);
    });
  });
  describe('right side', () => {
    const br = new BookReader({ data: SAMPLE_DATA });
    br.init();
    br.calculateSpreadSize();

    test('rightLeafCss', () => {
      expect(Object.keys(br._modes.mode2Up.rightLeafCss)).toEqual([
        'position',
        'right',
        'top',
        'zIndex',
        'height',
        'left',
        'width',
      ]);
    });
    test('leafEdgeRCss', () => {
      expect(Object.keys(br._modes.mode2Up.leafEdgeRCss)).toEqual([
        'height',
        'width',
        'left',
        'top',
        'border'
      ]);
    });
  });
  describe('full width container, overlay + spine', () => {
    test('mainContainerCss', () => {
      const br = new BookReader({ data: SAMPLE_DATA });
      br.init();
      br.calculateSpreadSize();

      expect(Object.keys(br._modes.mode2Up.mainContainerCss)).toEqual(['height', 'width', 'position']);
    });
    test('spreadCoverCss', () => {
      const br = new BookReader({ data: SAMPLE_DATA });
      br.init();
      br.calculateSpreadSize();
      expect(Object.keys(br._modes.mode2Up.spreadCoverCss)).toEqual(['width', 'height', 'visibility']);
    });
    test('spineCss', () => {
      const br = new BookReader({ data: SAMPLE_DATA });
      br.init();
      br.calculateSpreadSize();
      expect(Object.keys(br._modes.mode2Up.spineCss)).toEqual(['width', 'height', 'left', 'top']);
    });
  });
});

describe('prepareTwoPageView', () => {
  describe('drawing spread', () => {
    test('always draws new spread if `drawNewSpread` is true ', () => {
      const br = new BookReader({ data: SAMPLE_DATA });
      br.init();
      const drawLeafs = sinon.spy(br._modes.mode2Up, 'drawLeafs');
      const resizeSpread = sinon.spy(br._modes.mode2Up, 'resizeSpread');
      const calculateSpreadSize = sinon.spy(br._modes.mode2Up, 'calculateSpreadSize');
      const pruneUnusedImgs = sinon.spy(br, 'pruneUnusedImgs');
      const prefetch = br.prefetch = sinon.spy();
      const bindGestures = sinon.spy(br, 'bindGestures');
      const centerView = sinon.spy(br._modes.mode2Up, 'centerView');
      const preparePopUp = sinon.spy(br._modes.mode2Up, 'preparePopUp');
      const updateBrClasses = sinon.spy(br, 'updateBrClasses');

      br.prepareTwoPageView(undefined, undefined, true);
      expect(prefetch.callCount).toBe(2);

      expect(resizeSpread.callCount).toBe(0);
      expect(drawLeafs.callCount).toBe(1);
      expect(calculateSpreadSize.callCount).toBe(1);
      expect(pruneUnusedImgs.callCount).toBe(1);
      expect(bindGestures.callCount).toBe(1);
      expect(centerView.callCount).toBe(1);
      expect(preparePopUp.callCount).toBe(1);
      expect(updateBrClasses.callCount).toBe(1);
    });

    test('resizes spread if no redraw is necessary', () => {
      const br = new BookReader({ data: SAMPLE_DATA });
      br.init();
      const drawLeafs = sinon.spy(br._modes.mode2Up, 'drawLeafs');
      const resizeSpread = sinon.spy(br._modes.mode2Up, 'resizeSpread');
      br.prepareTwoPageView();
      expect(drawLeafs.callCount).toBe(0);
      expect(resizeSpread.callCount).toBe(1);
    });
  });
});
