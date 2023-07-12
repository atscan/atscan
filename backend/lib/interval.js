export function Interval(fn, duration, ...args) {
  const _this = this;
  this.baseline = undefined;

  this.run = function (flag) {
    if (_this.baseline === undefined) {
      _this.baseline = performance.now() - duration;
    }
    if (flag) {
      fn(...args);
    }
    const end = performance.now();
    _this.baseline += duration;

    let nextTick = duration - (end - _this.baseline);
    if (nextTick < 0) {
      nextTick = 0;
    }

    //console.log(nextTick);
    _this.timer = setTimeout(function () {
      _this.run(true);
    }, nextTick);
  };

  this.stop = function () {
    clearTimeout(_this.timer);
  };
}
