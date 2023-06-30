export function timeout(ms, promise) {
  return new Promise(function (resolve, reject) {
    const start = performance.now();
    setTimeout(function () {
      reject(new Error("timeout"));
    }, ms);
    promise.then((v) => {
      const end = performance.now();
      return resolve([v, end - start]);
    }, reject);
  });
}
